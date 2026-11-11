import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Footprints, Lock, TriangleAlert } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getZonesForUser } from "@/lib/zones";
import { isFull, suggestAlternatives } from "@/lib/alternatives";
import { STATUS_COLOR, STATUS_LABEL } from "@/components/status";

export const metadata = { title: "Zone | Where Did I Park?" };
export const instant = false;

export default async function ZoneDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const zoneId = Number(id);
  if (!Number.isInteger(zoneId)) notFound();

  const session = await auth();
  if (!session?.user) redirect("/login");

  const zones = await getZonesForUser(session.user.id);
  const zone = zones.find((z) => z.id === zoneId);
  if (!zone) notFound();

  const access = await prisma.zoneAccess.findMany({
    where: { zoneId },
    include: { category: { select: { name: true } } },
    orderBy: { categoryId: "asc" },
  });
  const full = isFull(zone);
  const alternatives = full || zone.status === "red" ? suggestAlternatives(zones, zone) : [];
  const hasCoords = zone.lat != null && zone.lng != null;

  return (
    <div className="space-y-4">
      <Link href="/discover" className="inline-flex items-center gap-1 text-sm text-muted hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to all zones
      </Link>

      <div className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">{zone.name}</h1>
            {zone.blockNumber != null && <p className="text-sm text-muted">Block {zone.blockNumber}</p>}
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium">
            <span className="h-3 w-3 rounded-full" style={{ background: STATUS_COLOR[zone.status] }} />
            {STATUS_LABEL[zone.status]}
          </span>
        </div>

        <p className="text-lg">
          {zone.capacity == null ? (
            <span className="text-muted">Capacity not confirmed</span>
          ) : (
            <>
              <b>{zone.available}</b> free of {zone.capacity} <span className="text-sm text-muted">({zone.occupied} parked)</span>
            </>
          )}
        </p>

        <div className="flex flex-wrap gap-2 text-xs">
          {!zone.isVerified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
              <TriangleAlert className="h-3 w-3" /> Unverified data
            </span>
          )}
          {zone.allowed ? (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800">You can park here</span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-red-800">
              <Lock className="h-3 w-3" /> {zone.deniedReason}
            </span>
          )}
        </div>

        {hasCoords ? (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${zone.lat},${zone.lng}&travelmode=walking`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white"
          >
            <Footprints className="h-4 w-4" /> Get directions
          </a>
        ) : (
          <p className="text-xs text-muted">Map location not confirmed yet.</p>
        )}
      </div>

      {(full || zone.status === "red") && (
        <div role="alert" className="space-y-2 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">{full ? "This zone is full." : "This zone is almost full."}</p>
          {alternatives.length > 0 ? (
            <>
              <p>Try one of these instead:</p>
              <ul className="space-y-1">
                {alternatives.map(({ zone: a, distanceKm }) => (
                  <li key={a.id}>
                    <Link href={`/discover/${a.id}`} className="font-medium underline">
                      {a.name}
                    </Link>{" "}
                    · {a.available == null ? "space unknown" : `${a.available} free`}
                    {distanceKm != null && ` · ${(distanceKm * 1000).toFixed(0)} m away`}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>No other allowed zone has space right now.</p>
          )}
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-2 font-semibold">Who can park here</h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {access.map((a) => (
            <li key={a.categoryId} className="rounded-full border border-border px-3 py-1">
              {a.category.name}
            </li>
          ))}
        </ul>
        {zone.blockNumber != null && (
          <p className="mt-2 text-xs text-muted">
            Students with an assigned block can only use zones up to their block (Business Block rule).
          </p>
        )}
      </section>
    </div>
  );
}
