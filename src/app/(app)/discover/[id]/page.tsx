import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Footprints, Lock, TriangleAlert } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getZonesForUser } from "@/lib/zones";
import { isFull, suggestAlternatives } from "@/lib/alternatives";
import { STATUS_COLOR, STATUS_LABEL } from "@/components/status";
import Ring from "@/components/ring";

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
  const pct = zone.capacity ? Math.round((zone.occupied / zone.capacity) * 100) : 0;
  const color = STATUS_COLOR[zone.status];

  return (
    <div className="space-y-4">
      <Link href="/discover" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to all zones
      </Link>

      <section className="app-header relative overflow-hidden rounded-2xl p-5 text-white shadow-[var(--shadow-lift)] sm:p-6">
        <span className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 animate-blob rounded-full bg-brand/35 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-5">
          <div className="rounded-full bg-white/95 p-1.5 shadow-lg dark:bg-[#0f1626]/90">
            <Ring pct={pct} color={color} size={104} stroke={10} known={zone.capacity != null}>
              {zone.capacity != null ? (
                <span className="text-foreground">
                  <span className="block text-2xl font-bold">{pct}%</span>
                  <span className="block text-[10px] uppercase tracking-wide text-muted">full</span>
                </span>
              ) : (
                <span className="text-2xl font-bold text-muted">?</span>
              )}
            </Ring>
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold sm:text-3xl">{zone.name}</h1>
            {zone.blockNumber != null && <p className="text-sm text-white/70">Block {zone.blockNumber}</p>}
            <p className="mt-2 text-lg">
              {zone.capacity == null ? (
                <span className="text-white/70">Capacity not confirmed</span>
              ) : (
                <>
                  <b className="text-2xl">{zone.available}</b> free of {zone.capacity}{" "}
                  <span className="text-sm text-white/60">({zone.occupied} parked)</span>
                </>
              )}
            </p>
            <p className="mt-1 inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs font-medium ring-1 ring-white/20">
              <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />
              {STATUS_LABEL[zone.status]}
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {zone.allowed ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> You can park here
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 font-medium text-red-800">
            <Lock className="h-3.5 w-3.5" aria-hidden /> {zone.deniedReason}
          </span>
        )}
        {!zone.isVerified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800">
            <TriangleAlert className="h-3.5 w-3.5" aria-hidden /> Unverified data
          </span>
        )}
        {hasCoords ? (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${zone.lat},${zone.lng}&travelmode=walking`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-grad ml-auto inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold"
          >
            <Footprints className="h-4 w-4" aria-hidden /> Get directions
          </a>
        ) : (
          <span className="ml-auto text-muted">Map location not confirmed yet.</span>
        )}
      </div>

      {(full || zone.status === "red") && (
        <div
          role="alert"
          className="animate-slide-down space-y-2 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
        >
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

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 font-semibold">Who can park here</h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {access.map((a) => (
            <li key={a.categoryId} className="rounded-full border border-border bg-background px-3.5 py-1.5">
              {a.category.name}
            </li>
          ))}
        </ul>
        {zone.blockNumber != null && (
          <p className="mt-3 text-xs text-muted">
            Students with an assigned block can only use zones up to their block (Business Block rule).
          </p>
        )}
      </section>
    </div>
  );
}
