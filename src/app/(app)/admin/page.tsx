import { Bike, LogIn, MapPinned, ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/admin";
import { availabilityStatus } from "@/lib/zones";
import { STATUS_COLOR, STATUS_LABEL } from "@/components/status";
import CountUp from "@/components/count-up";
import PeakChart from "@/components/peak-chart";
import { checkInsByHour } from "@/lib/stats";

export const metadata = { title: "Admin | Where Did I Park?" };
export const instant = false;

/** Midnight today in IST, as a Date. */
function istMidnight(now = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now); // YYYY-MM-DD
  return new Date(`${ymd}T00:00:00+05:30`);
}

const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? " AM" : " PM"}`;

const card = "rounded-2xl border border-border bg-card p-5";

export default async function AdminDashboard() {
  await requireAdminPage();

  const since7 = new Date(Date.now() - 7 * 24 * 3600_000);
  const since30 = new Date(Date.now() - 30 * 24 * 3600_000);

  const [zones, open, today, openViolations, violationsByType, hourly, unverified, tags] = await Promise.all([
    prisma.zone.findMany({ where: { isActive: true }, select: { id: true, name: true, capacity: true }, orderBy: { name: "asc" } }),
    prisma.parkingRecord.groupBy({ by: ["zoneId"], where: { status: "OPEN" }, _count: { _all: true } }),
    prisma.parkingRecord.count({ where: { checkInAt: { gte: istMidnight() } } }),
    prisma.violation.count({ where: { status: "OPEN" } }),
    prisma.violation.groupBy({ by: ["type"], where: { createdAt: { gte: since30 } }, _count: { _all: true }, orderBy: { _count: { type: "desc" } } }),
    checkInsByHour(since7),
    prisma.zone.count({ where: { isVerified: false, isActive: true } }),
    prisma.rfidTag.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const occ = new Map(open.map((o) => [o.zoneId, o._count._all]));
  const parkedNow = open.reduce((s, o) => s + o._count._all, 0);
  const totalCapacity = zones.reduce((s, z) => s + (z.capacity ?? 0), 0);

  const perZone = zones
    .map((z) => ({ ...z, occupied: occ.get(z.id) ?? 0 }))
    .sort((a, b) => b.occupied - a.occupied || a.name.localeCompare(b.name));

  const byHour = new Map(hourly.map((r) => [r.h, r.n]));
  const hours = Array.from({ length: 24 }, (_, h) => ({ h, n: byHour.get(h) ?? 0 }));
  const peak = hours.reduce((a, b) => (b.n > a.n ? b : a), hours[0]);
  const tagCount = (s: string) => tags.find((t) => t.status === s)?._count._all ?? 0;
  const maxViolations = Math.max(1, ...violationsByType.map((v) => v._count._all));

  const stats = [
    { label: "Parked now", value: parkedNow, sub: totalCapacity ? `of ${totalCapacity.toLocaleString("en-IN")} capacity` : "capacity not set", icon: Bike, tint: "bg-blue-500/12 text-blue-600 dark:text-blue-400" },
    { label: "Check-ins today", value: today, sub: "since midnight IST", icon: LogIn, tint: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" },
    { label: "Open violations", value: openViolations, sub: "need review", icon: ShieldAlert, tint: "bg-red-500/12 text-red-600 dark:text-red-400" },
    { label: "Unverified zones", value: unverified, sub: "capacity/location unconfirmed", icon: MapPinned, tint: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted">Live picture of campus parking.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            style={{ animationDelay: `${i * 70}ms` }}
            className="lift animate-fade-up rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-muted">{s.label}</p>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${s.tint}`}>
                <s.icon className="h-[18px] w-[18px]" aria-hidden />
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold leading-none">
              <CountUp value={s.value} />
            </p>
            <p className="mt-1.5 text-xs text-muted">{s.sub}</p>
          </div>
        ))}
      </div>

      <section className={card}>
        <h2 className="font-semibold">Peak hours</h2>
        <p className="mb-1 text-xs text-muted">
          Check-ins by hour of day over the last 7 days (IST).{" "}
          {peak.n > 0 ? `Busiest hour: ${hourLabel(peak.h)} (${peak.n} check-ins).` : "No check-ins yet."}
        </p>
        <PeakChart hours={hours} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={card}>
          <h2 className="mb-3 font-semibold">Occupancy by zone</h2>
          <ul className="max-h-[26rem] space-y-3 overflow-auto pr-1 text-sm">
            {perZone.map((z, i) => {
              const status = availabilityStatus(z.capacity, z.occupied);
              const pct = z.capacity ? Math.min(100, Math.round((z.occupied / z.capacity) * 100)) : 0;
              return (
                <li key={z.id}>
                  <div className="flex justify-between gap-2">
                    <span className="truncate">{z.name}</span>
                    <span className="shrink-0 tabular-nums text-muted">
                      {z.capacity == null ? `${z.occupied} (no capacity)` : `${z.occupied}/${z.capacity}`}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-track" role="img" aria-label={`${pct}% full. ${STATUS_LABEL[status]}`}>
                    <div
                      className="meter-fill h-full rounded-full"
                      style={{ width: `${pct}%`, background: STATUS_COLOR[status], animationDelay: `${Math.min(i, 14) * 40}ms` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="space-y-4">
          <section className={card}>
            <h2 className="mb-3 font-semibold">Violations (last 30 days)</h2>
            <ul className="space-y-3 text-sm">
              {violationsByType.length === 0 && <li className="text-muted">None recorded.</li>}
              {violationsByType.map((v, i) => (
                <li key={v.type}>
                  <div className="flex justify-between">
                    <span>{v.type.replaceAll("_", " ")}</span>
                    <b>{v._count._all}</b>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-track">
                    <div
                      className="meter-fill h-full rounded-full bg-chart"
                      style={{ width: `${(v._count._all / maxViolations) * 100}%`, animationDelay: `${i * 80}ms` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className={card}>
            <h2 className="mb-3 font-semibold">RFID tags</h2>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-emerald-500/12 px-3 py-1 font-medium text-emerald-700 dark:text-emerald-400">
                <b>{tagCount("ACTIVE")}</b> active
              </span>
              <span className="rounded-full bg-amber-500/15 px-3 py-1 font-medium text-amber-700 dark:text-amber-400">
                <b>{tagCount("BLOCKED")}</b> blocked
              </span>
              <span className="rounded-full bg-red-500/12 px-3 py-1 font-medium text-red-700 dark:text-red-400">
                <b>{tagCount("LOST")}</b> lost
              </span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
