import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fmtIst, toCsv, type Cell } from "@/lib/csv";

const MAX_ROWS = 50_000;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Optional ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive, IST). Returns undefined for no filter, null if invalid. */
function dateRange(params: URLSearchParams): { gte?: Date; lt?: Date } | null {
  const from = params.get("from");
  const to = params.get("to");
  const range: { gte?: Date; lt?: Date } = {};
  if (from) {
    if (!DAY.test(from)) return null;
    range.gte = new Date(`${from}T00:00:00+05:30`);
  }
  if (to) {
    if (!DAY.test(to)) return null;
    range.lt = new Date(new Date(`${to}T00:00:00+05:30`).getTime() + 24 * 3600_000);
  }
  if ((range.gte && isNaN(range.gte.getTime())) || (range.lt && isNaN(range.lt.getTime()))) return null;
  if (range.gte && range.lt && range.gte >= range.lt) return null;
  return range;
}

function csvResponse(name: string, body: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(req: Request, { params }: { params: Promise<{ type: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { type } = await params;
  const range = dateRange(new URL(req.url).searchParams);
  if (range === null) return NextResponse.json({ error: "Invalid date range (use YYYY-MM-DD)" }, { status: 400 });

  if (type === "violations") {
    const rows = await prisma.violation.findMany({
      where: Object.keys(range).length ? { createdAt: range } : {},
      orderBy: { createdAt: "desc" },
      take: MAX_ROWS,
      include: {
        user: { select: { name: true, regNo: true } },
        reporter: { select: { name: true } },
        zone: { select: { name: true } },
      },
    });
    return csvResponse(
      "violations",
      toCsv(
        ["Created (IST)", "Type", "Status", "Fine (INR)", "Owner", "Owner reg no", "Zone", "Reported by", "Details", "Resolved (IST)"],
        rows.map((v): Cell[] => [
          fmtIst(v.createdAt), v.type, v.status, v.fineAmount, v.user?.name ?? "Unregistered", v.user?.regNo,
          v.zone?.name, v.reporter?.name ?? "System", v.details, fmtIst(v.resolvedAt),
        ]),
      ),
    );
  }

  if (type === "parking") {
    const rows = await prisma.parkingRecord.findMany({
      where: Object.keys(range).length ? { checkInAt: range } : {},
      orderBy: { checkInAt: "desc" },
      take: MAX_ROWS,
      include: {
        zone: { select: { name: true } },
        vehicle: { select: { plateNo: true, owner: { select: { name: true, regNo: true } } } },
      },
    });
    return csvResponse(
      "parking-history",
      toCsv(
        ["Check-in (IST)", "Check-out (IST)", "Minutes parked", "Status", "Method", "Plate", "Owner", "Owner reg no", "Zone", "Note"],
        rows.map((r): Cell[] => [
          fmtIst(r.checkInAt), fmtIst(r.checkOutAt),
          r.checkOutAt ? Math.round((r.checkOutAt.getTime() - r.checkInAt.getTime()) / 60000) : null,
          r.status, r.method, r.vehicle.plateNo, r.vehicle.owner.name, r.vehicle.owner.regNo, r.zone.name, r.note,
        ]),
      ),
    );
  }

  if (type === "zones") {
    const [zones, open] = await Promise.all([
      prisma.zone.findMany({ orderBy: { name: "asc" }, include: { block: { select: { number: true } } } }),
      prisma.parkingRecord.groupBy({ by: ["zoneId"], where: { status: "OPEN" }, _count: { _all: true } }),
    ]);
    const occ = new Map(open.map((o) => [o.zoneId, o._count._all]));
    return csvResponse(
      "zones-occupancy",
      toCsv(
        ["Zone", "Block", "Capacity", "Parked now", "Available", "Verified", "Active", "Latitude", "Longitude", "Data source"],
        zones.map((z): Cell[] => {
          const parked = occ.get(z.id) ?? 0;
          return [
            z.name, z.block?.number, z.capacity, parked,
            z.capacity == null ? null : Math.max(z.capacity - parked, 0),
            z.isVerified, z.isActive, z.lat, z.lng, z.dataSource,
          ];
        }),
      ),
    );
  }

  return NextResponse.json({ error: "Unknown report" }, { status: 404 });
}
