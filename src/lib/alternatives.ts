import type { ZoneDTO } from "@/lib/zones";

function distanceKm(a: ZoneDTO, b: ZoneDTO): number | null {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type Alternative = { zone: ZoneDTO; distanceKm: number | null };

/**
 * Other zones the rider may use that still have space.
 * Nearest first when coordinates are known, otherwise most free space first.
 */
export function suggestAlternatives(all: ZoneDTO[], current: ZoneDTO, limit = 3): Alternative[] {
  return all
    .filter((z) => z.id !== current.id && z.allowed && (z.status === "green" || z.status === "amber"))
    .map((zone) => ({ zone, distanceKm: distanceKm(current, zone) }))
    .sort((a, b) => {
      if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
      if (a.distanceKm != null) return -1;
      if (b.distanceKm != null) return 1;
      return (b.zone.available ?? 0) - (a.zone.available ?? 0);
    })
    .slice(0, limit);
}

export const isFull = (z: ZoneDTO) => z.capacity != null && (z.available ?? 0) === 0;
