import { prisma } from "@/lib/prisma";

/**
 * Overstay / overnight policy (defaults for the demo, adjust to LPU's real rules):
 * - Hostel residents and VIP/operational vehicles may stay parked overnight and for long periods.
 * - Everyone else is flagged if still parked during the night window, or after MAX_STAY_HOURS.
 */
export const MAX_STAY_HOURS = 12;
export const NIGHT_START_HOUR = 22; // 10 PM IST
export const NIGHT_END_HOUR = 5; // 5 AM IST
export const EXEMPT_CATEGORIES = ["HOSTEL_BOYS", "HOSTEL_GIRLS", "VIP"];

export function istHour(now: Date): number {
  const h = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }).format(now);
  return Number(h) % 24;
}

export function isNight(now: Date): boolean {
  const h = istHour(now);
  return h >= NIGHT_START_HOUR || h < NIGHT_END_HOUR;
}

/** Creates one OVERSTAY violation per open record that breaks the policy. Safe to run repeatedly. */
export async function detectOverstays(actorId: string | null, now = new Date()): Promise<number> {
  const open = await prisma.parkingRecord.findMany({
    where: {
      status: "OPEN",
      vehicle: { owner: { category: { code: { notIn: EXEMPT_CATEGORIES } } } },
      violations: { none: { type: "OVERSTAY" } },
    },
    include: { vehicle: { select: { plateNo: true, ownerId: true } }, zone: { select: { name: true } } },
  });

  let created = 0;
  for (const r of open) {
    const hours = (now.getTime() - r.checkInAt.getTime()) / 3_600_000;
    const reason = isNight(now)
      ? "Vehicle left parked overnight (not permitted for this permit category)"
      : hours > MAX_STAY_HOURS
        ? `Parked for ${hours.toFixed(1)} hours (limit ${MAX_STAY_HOURS})`
        : null;
    if (!reason) continue;

    await prisma.violation.create({
      data: {
        type: "OVERSTAY",
        details: `Plate ${r.vehicle.plateNo}: ${reason}`,
        userId: r.vehicle.ownerId,
        reporterId: actorId,
        zoneId: r.zoneId,
        recordId: r.id,
      },
    });
    created++;
  }

  if (created > 0) {
    await prisma.auditLog.create({
      data: { actorId, action: "OVERSTAY_CHECK", entity: "ParkingRecord", meta: { created } },
    });
  }
  return created;
}
