import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/admin";
import ZonesManager from "@/components/zones-manager";

export const metadata = { title: "Zones | Admin" };
export const instant = false;

export default async function AdminZonesPage() {
  await requireAdminPage();

  const [zones, open, categories] = await Promise.all([
    prisma.zone.findMany({
      orderBy: { name: "asc" },
      include: { block: { select: { number: true } }, access: { select: { categoryId: true } } },
    }),
    prisma.parkingRecord.groupBy({ by: ["zoneId"], where: { status: "OPEN" }, _count: { _all: true } }),
    prisma.permitCategory.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true } }),
  ]);
  const occ = new Map(open.map((o) => [o.zoneId, o._count._all]));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Zones</h1>
      <ZonesManager
        categories={categories}
        zones={zones.map((z) => ({
          id: z.id,
          name: z.name,
          blockNumber: z.block?.number ?? null,
          capacity: z.capacity,
          occupied: occ.get(z.id) ?? 0,
          lat: z.lat,
          lng: z.lng,
          isVerified: z.isVerified,
          isActive: z.isActive,
          dataSource: z.dataSource,
          categoryIds: z.access.map((a) => a.categoryId),
        }))}
      />
    </div>
  );
}
