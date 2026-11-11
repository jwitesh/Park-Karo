"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { isFull } from "@/lib/alternatives";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { List, Lock, Map as MapIcon, Search, TriangleAlert } from "lucide-react";
import type { ZoneDTO } from "@/lib/zones";
import { STATUS_COLOR, STATUS_LABEL } from "@/components/status";
import { cn } from "@/lib/utils";

const ZoneMap = dynamic(() => import("@/components/zone-map"), {
  ssr: false,
  loading: () => <div className="h-[55vh] animate-pulse rounded-xl bg-border" />,
});

async function fetchZones(): Promise<ZoneDTO[]> {
  const res = await fetch("/api/zones");
  if (!res.ok) throw new Error("Failed to load zones");
  return (await res.json()).zones;
}

export default function DiscoverClient() {
  const [view, setView] = useState<"list" | "map">("list");
  const [onlyAllowed, setOnlyAllowed] = useState(true);
  const [onlyFree, setOnlyFree] = useState(false);
  const [q, setQ] = useState("");

  const { data, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ["zones"],
    queryFn: fetchZones,
    refetchInterval: 20_000,
  });

  const zones = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? [])
      .filter((z) => (onlyAllowed ? z.allowed : true))
      .filter((z) => (onlyFree ? z.status === "green" || z.status === "amber" : true))
      .filter((z) => (term ? z.name.toLowerCase().includes(term) : true));
  }, [data, onlyAllowed, onlyFree, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search zones (e.g. BH-3, Block 32)"
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <div className="flex overflow-hidden rounded-lg border border-border text-sm">
          {(["list", "map"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn("flex items-center gap-1 px-3 py-2", view === v ? "bg-brand text-white" : "bg-card")}
            >
              {v === "list" ? <List className="h-4 w-4" /> : <MapIcon className="h-4 w-4" />}
              {v === "list" ? "List" : "Map"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={onlyAllowed} onChange={(e) => setOnlyAllowed(e.target.checked)} />
          Only zones I can use
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={onlyFree} onChange={(e) => setOnlyFree(e.target.checked)} />
          Has free space
        </label>
        {dataUpdatedAt > 0 && (
          <span className="ml-auto text-xs text-muted">
            Updated {new Date(dataUpdatedAt).toLocaleTimeString()} · refreshes every 20s
          </span>
        )}
      </div>

      {isLoading && <p className="text-muted">Loading zones…</p>}
      {isError && <p className="text-red-600">Could not load zones. Retrying…</p>}

      {view === "map" ? (
        <ZoneMap zones={zones} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {zones.map((z) => (
            <li
              key={z.id}
              className={cn("rounded-xl border border-border bg-card p-4 shadow-sm", !z.allowed && "opacity-60")}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">
                    <Link href={`/discover/${z.id}`} className="hover:underline">
                      {z.name}
                    </Link>
                  </h3>
                  {z.blockNumber != null && <p className="text-xs text-muted">Block {z.blockNumber}</p>}
                </div>
                <span
                  className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium"
                  title={STATUS_LABEL[z.status]}
                >
                  <span className="h-3 w-3 rounded-full" style={{ background: STATUS_COLOR[z.status] }} />
                  {STATUS_LABEL[z.status]}
                </span>
              </div>

              <p className="mt-2 text-sm">
                {z.capacity == null ? (
                  <span className="text-muted">Capacity not confirmed</span>
                ) : (
                  <>
                    <b>{z.available}</b> free of {z.capacity}
                  </>
                )}
              </p>

              {z.allowed && isFull(z) && (
                <p className="mt-2 rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-800">
                  Full.{" "}
                  <Link href={`/discover/${z.id}`} className="underline">
                    See nearby alternatives
                  </Link>
                </p>
              )}

              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {!z.isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                    <TriangleAlert className="h-3 w-3" /> Unverified
                  </span>
                )}
                {!z.allowed && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-red-800">
                    <Lock className="h-3 w-3" /> {z.deniedReason}
                  </span>
                )}
              </div>
            </li>
          ))}
          {!isLoading && zones.length === 0 && (
            <li className="text-muted sm:col-span-2">No zones match these filters.</li>
          )}
        </ul>
      )}
    </div>
  );
}
