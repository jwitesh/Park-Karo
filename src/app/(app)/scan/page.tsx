import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ScanClient from "@/components/scan-client";

export const metadata = { title: "Scan | Where Did I Park?" };
export const instant = false;

export default async function ScanPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ATTENDANT" && session.user.role !== "ADMIN")) {
    redirect("/discover");
  }

  const [zones, open, recent, tags] = await Promise.all([
    prisma.zone.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, capacity: true } }),
    prisma.parkingRecord.groupBy({ by: ["zoneId"], where: { status: "OPEN" }, _count: { _all: true } }),
    prisma.parkingRecord.findMany({
      orderBy: { checkInAt: "desc" },
      take: 8,
      include: { vehicle: { select: { plateNo: true } }, zone: { select: { name: true } } },
    }),
    prisma.rfidTag.findMany({
      where: { vehicleId: { not: null } },
      orderBy: { uid: "asc" },
      select: { uid: true, vehicle: { select: { plateNo: true } } },
    }),
  ]);

  const occ = new Map(open.map((o) => [o.zoneId, o._count._all]));

  return (
    <ScanClient
      zones={zones.map((z) => ({ id: z.id, name: z.name, capacity: z.capacity, occupied: occ.get(z.id) ?? 0 }))}
      demoTags={tags.map((t) => ({ uid: t.uid, plateNo: t.vehicle?.plateNo ?? "" }))}
      recent={recent.map((r) => ({
        id: r.id,
        plateNo: r.vehicle.plateNo,
        zone: r.zone.name,
        status: r.status,
        method: r.method,
        at: (r.checkOutAt ?? r.checkInAt).toISOString(),
      }))}
    />
  );
}
