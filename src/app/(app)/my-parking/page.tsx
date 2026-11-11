import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getZonesForUser } from "@/lib/zones";
import MyParkingClient from "@/components/my-parking-client";

export const metadata = { title: "My Parking | Where Did I Park?" };
export const instant = false;

const fmt = (d: Date) =>
  d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default async function MyParkingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const [vehicles, history, violations, zones] = await Promise.all([
    prisma.vehicle.findMany({
      where: { ownerId: userId },
      orderBy: { plateNo: "asc" },
      include: {
        records: {
          where: { status: "OPEN" },
          take: 1,
          include: { zone: { select: { name: true, lat: true, lng: true } } },
        },
      },
    }),
    prisma.parkingRecord.findMany({
      where: { vehicle: { ownerId: userId }, status: "CLOSED" },
      orderBy: { checkInAt: "desc" },
      take: 10,
      include: { zone: { select: { name: true } }, vehicle: { select: { plateNo: true } } },
    }),
    prisma.violation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { zone: { select: { name: true } } },
    }),
    getZonesForUser(userId),
  ]);

  return (
    <MyParkingClient
      vehicles={vehicles.map((v) => {
        const open = v.records[0];
        return {
          id: v.id,
          plateNo: v.plateNo,
          open: open
            ? {
                recordId: open.id,
                zoneName: open.zone.name,
                since: fmt(open.checkInAt),
                note: open.note ?? "",
                lat: open.zone.lat,
                lng: open.zone.lng,
              }
            : null,
        };
      })}
      allowedZones={zones
        .filter((z) => z.allowed && z.status !== "red")
        .map((z) => ({ id: z.id, name: z.name, available: z.available }))}
      allZones={zones.map((z) => ({ id: z.id, name: z.name }))}
      history={history.map((h) => ({
        id: h.id,
        plateNo: h.vehicle.plateNo,
        zone: h.zone.name,
        from: fmt(h.checkInAt),
        to: h.checkOutAt ? fmt(h.checkOutAt) : "",
      }))}
      violations={violations.map((v) => ({
        id: v.id,
        type: v.type,
        status: v.status,
        details: v.details ?? "",
        zone: v.zone?.name ?? null,
        at: fmt(v.createdAt),
        fine: v.fineAmount,
      }))}
    />
  );
}
