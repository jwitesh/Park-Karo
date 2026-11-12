"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowUpRight, List, Lock, Map as MapIcon, MapPinOff, Search, TriangleAlert } from "lucide-react";
import type { ZoneDTO } from "@/lib/zones";
import { isFull } from "@/lib/alternatives";
import { STATUS_COLOR, STATUS_LABEL } from "@/components/status";
import CountUp from "@/components/count-up";
import Ring from "@/components/ring";
import { cn } from "@/lib/utils";

const ZoneMap = dynamic(() => import("@/components/zone-map"), {
  ssr: false,
  loading: () => <div className="skeleton h-[55vh] rounded-2xl" />,
});

async function fetchZones(): Promise<ZoneDTO[]> {
  const res = await fetch("/api/zones");
  if (!res.ok) throw new Error("Failed to load zones");
  return (await res.json()).zones;
}

function Switch({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex items-center gap-2.5 py-1 text-sm"
    >
      <span className={cn("relative h-6 w-10 rounded-full transition-colors duration-300", checked ? "bg-brand" : "bg-track")}>
        <span
          className={cn(
            "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300",
            checked && "translate-x-4",
          )}
        />
      </span>
      {children}
    </button>
  );
}

export default function DiscoverClient({ firstName, greeting }: { firstName: string; greeting: string }) {
  const [view, setView] = useState<"list" | "map">("list");
  const [onlyAllowed, setOnlyAllowed] = useState(true);
  const [onlyFree, setOnlyFree] = useState(false);
  const [q, setQ] = useState("");

  const { data, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ["zones"],
    queryFn: fetchZones,
    refetchInterval: 20_000,
  });

  const stats = useMemo(() => {
    const mine = (data ?? []).filter((z) => z.allowed);
    return {
      zones: mine.filter((z) => z.status === "green" || z.status === "amber").length,
      free: mine.reduce((s, z) => s + (z.available ?? 0), 0),
      total: mine.length,
    };
  }, [data]);

  const zones = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? [])
      .filter((z) => (onlyAllowed ? z.allowed : true))
      .filter((z) => (onlyFree ? z.status === "green" || z.status === "amber" : true))
      .filter((z) => (term ? z.name.toLowerCase().includes(term) : true));
  }, [data, onlyAllowed, onlyFree, q]);

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------------ hero */}
      <section className="app-header relative overflow-hidden rounded-2xl p-5 text-white shadow-[var(--shadow-lift)] sm:p-6">
        <span className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 animate-blob rounded-full bg-brand/40 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 animate-blob rounded-full bg-sky-400/25 blur-3xl [animation-delay:-6s]" />
        <div className="relative">
          <p className="text-sm text-white/70">
            {greeting}, {firstName}
          </p>
          <h1 className="mt-0.5 text-2xl font-bold sm:text-3xl">Find parking</h1>
          <p className="mt-1 max-w-md text-sm text-white/70">Live availability for two-wheeler zones across campus.</p>

          <div className="mt-4 grid grid-cols-3 gap-2 sm:max-w-lg sm:gap-3">
            {[
              { label: "Zones with space", value: stats.zones, sub: `of ${stats.total} yours` },
              { label: "Free spaces", value: stats.free, sub: "across your zones" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur">
                <p className="text-[11px] leading-tight text-white/70">{s.label}</p>
                <p className="mt-1 text-2xl font-bold leading-none">
                  <CountUp value={s.value} />
                </p>
                <p className="mt-1 text-[10px] text-white/55">{s.sub}</p>
              </div>
            ))}
            <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur">
              <p className="text-[11px] leading-tight text-white/70">Status</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold leading-none">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>
                Live
              </p>
              <p className="mt-1 text-[10px] text-white/55">
                {dataUpdatedAt > 0 ? new Date(dataUpdatedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "connecting"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-40 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-muted" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search zones"
            aria-label="Search zones"
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-4 focus:ring-brand/20"
          />
        </div>

        <div className="relative grid grid-cols-2 rounded-xl border border-border bg-card p-1 text-sm font-medium">
          <span
            aria-hidden
            className={cn(
              "absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg bg-brand shadow-md shadow-brand/30 transition-transform duration-300 ease-[var(--ease)]",
              view === "map" && "translate-x-full",
            )}
          />
          {(["list", "map"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "relative z-10 flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 transition-colors",
                view === v ? "text-white" : "text-muted hover:text-foreground",
              )}
            >
              {v === "list" ? <List className="h-4 w-4" aria-hidden /> : <MapIcon className="h-4 w-4" aria-hidden />}
              {v === "list" ? "List" : "Map"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
        <Switch checked={onlyAllowed} onChange={setOnlyAllowed}>
          Only zones I can use
        </Switch>
        <Switch checked={onlyFree} onChange={setOnlyFree}>
          Has free space
        </Switch>
        <span className="ml-auto text-xs text-muted">Refreshes every 20s</span>
      </div>

      {isError && (
        <p role="alert" className="animate-slide-down rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          Could not load zones. Retrying…
        </p>
      )}

      {/* ------------------------------------------------------------ views */}
      {view === "map" ? (
        <div className="animate-scale-in">
          <ZoneMap zones={zones} />
        </div>
      ) : isLoading ? (
        <ul className="grid gap-3 sm:grid-cols-2" aria-busy="true" aria-label="Loading zones">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="skeleton h-[112px] rounded-2xl" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </ul>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {zones.map((z, i) => {
            const pct = z.capacity ? Math.round((z.occupied / z.capacity) * 100) : 0;
            const color = STATUS_COLOR[z.status];
            return (
              <li
                key={z.id}
                style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}
                className={cn(
                  "lift relative animate-fade-up overflow-hidden rounded-2xl border border-border bg-card p-4",
                  !z.allowed && "opacity-70",
                )}
              >
                <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: color }} aria-hidden />
                <div className="flex items-center gap-4 pl-1.5">
                  <Ring pct={pct} color={color} known={z.capacity != null}>
                    {z.capacity != null ? (
                      <span>
                        <span className="block text-[15px] font-bold">{pct}%</span>
                        <span className="block text-[9px] uppercase tracking-wide text-muted">full</span>
                      </span>
                    ) : (
                      <span className="text-lg font-bold text-muted">?</span>
                    )}
                  </Ring>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate font-semibold">
                        <Link href={`/discover/${z.id}`} className="after:absolute after:inset-0 hover:underline">
                          {z.name}
                        </Link>
                      </h3>
                      <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                    </div>
                    {z.blockNumber != null && <p className="text-xs text-muted">Block {z.blockNumber}</p>}

                    <p className="mt-1 text-sm">
                      {z.capacity == null ? (
                        <span className="text-muted">Capacity not confirmed</span>
                      ) : (
                        <>
                          <b>{z.available}</b> free of {z.capacity}
                        </>
                      )}
                    </p>

                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--muted)" }}>
                      <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />
                      {STATUS_LABEL[z.status]}
                    </p>
                  </div>
                </div>

                {z.allowed && isFull(z) && (
                  <p className="relative z-10 mt-3 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800 dark:bg-red-950/50 dark:text-red-300">
                    Full.{" "}
                    <Link href={`/discover/${z.id}`} className="underline">
                      See nearby alternatives
                    </Link>
                  </p>
                )}

                {(!z.isVerified || !z.allowed) && (
                  <div className="mt-3 flex flex-wrap gap-2 pl-1.5 text-xs">
                    {!z.isVerified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                        <TriangleAlert className="h-3 w-3" aria-hidden /> Unverified
                      </span>
                    )}
                    {!z.allowed && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-red-800">
                        <Lock className="h-3 w-3" aria-hidden /> {z.deniedReason}
                      </span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
          {zones.length === 0 && (
            <li className="animate-fade-in rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted sm:col-span-2">
              <MapPinOff className="mx-auto mb-2 h-8 w-8 animate-float" aria-hidden />
              No zones match these filters.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
