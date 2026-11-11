import { prisma } from "@/lib/prisma";

export type AvailabilityStatus = "green" | "amber" | "red" | "grey";

export type ZoneDTO = {
  id: number;
  name: string;
  blockNumber: number | null;
  capacity: number | null;
  occupied: number;
  available: number | null;
  status: AvailabilityStatus;
  lat: number | null;
  lng: number | null;
  isVerified: boolean;
  allowed: boolean;
  deniedReason: string | null;
};

export function availabilityStatus(capacity: number | null, occupied: number): AvailabilityStatus {
  if (capacity == null || capacity <= 0) return "grey";
  const ratio = occupied / capacity;
  if (ratio >= 1) return "red";
  if (ratio >= 0.85) return "red";
  if (ratio >= 0.6) return "amber";
  return "green";
}

/** Category check + optional Business Block (maxBlock) check. */
export function checkAccess(
  user: { categoryId: number | null; maxBlock: number | null },
  zone: { allowedCategoryIds: number[]; blockNumber: number | null },
): { allowed: boolean; reason: string | null; violation: "WRONG_ZONE" | "BLOCK_RULE" | null } {
  if (user.categoryId == null || !zone.allowedCategoryIds.includes(user.categoryId)) {
    return { allowed: false, reason: "Your permit category is not allowed in this zone", violation: "WRONG_ZONE" };
  }
  if (user.maxBlock != null && zone.blockNumber != null && zone.blockNumber > user.maxBlock) {
    return {
      allowed: false,
      reason: `Zone is beyond your assigned block (Block ${user.maxBlock})`,
      violation: "BLOCK_RULE",
    };
  }
  return { allowed: true, reason: null, violation: null };
}

export async function getZonesForUser(userId: string): Promise<ZoneDTO[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { categoryId: true, maxBlock: true },
  });
  if (!user) return [];

  const [zones, open] = await Promise.all([
    prisma.zone.findMany({
      where: { isActive: true },
      include: { block: true, access: { select: { categoryId: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.parkingRecord.groupBy({
      by: ["zoneId"],
      where: { status: "OPEN" },
      _count: { _all: true },
    }),
  ]);
  const occ = new Map(open.map((o) => [o.zoneId, o._count._all]));

  return zones.map((z) => {
    const occupied = occ.get(z.id) ?? 0;
    const blockNumber = z.block?.number ?? null;
    const { allowed, reason } = checkAccess(user, {
      allowedCategoryIds: z.access.map((a) => a.categoryId),
      blockNumber,
    });
    return {
      id: z.id,
      name: z.name,
      blockNumber,
      capacity: z.capacity,
      occupied,
      available: z.capacity == null ? null : Math.max(z.capacity - occupied, 0),
      status: availabilityStatus(z.capacity, occupied),
      lat: z.lat,
      lng: z.lng,
      isVerified: z.isVerified,
      allowed,
      deniedReason: reason,
    };
  });
}
