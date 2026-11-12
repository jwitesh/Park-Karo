import { prisma } from "@/lib/prisma";

/**
 * Check-ins per hour of day (0-23) in India time, for everything since `since`.
 *
 * "checkInAt" is a `timestamp` WITHOUT time zone that stores UTC. The first AT TIME ZONE 'UTC' labels it as UTC,
 * the second converts it to Kolkata wall-clock time. (A single AT TIME ZONE 'Asia/Kolkata' on the raw column does
 * the opposite: it treats the stored UTC value as if it were already Kolkata time and shifts the hour by 5h30.)
 */
export async function checkInsByHour(since: Date): Promise<{ h: number; n: number }[]> {
  return prisma.$queryRaw<{ h: number; n: number }[]>`
    SELECT EXTRACT(HOUR FROM ("checkInAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')::int AS h,
           COUNT(*)::int AS n
    FROM "ParkingRecord"
    WHERE "checkInAt" >= ${since}
    GROUP BY 1`;
}
