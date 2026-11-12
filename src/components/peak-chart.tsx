"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Hour = { h: number; n: number };

const label = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "a" : "p"}`;
const long = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;

/** Clean axis maximum: 4, then steps of 2 / 5 / 10. */
function niceMax(n: number): number {
  if (n <= 4) return 4;
  const step = n <= 10 ? 2 : n <= 20 ? 5 : 10;
  return Math.ceil(n / step) * step;
}

/**
 * Single-series column chart: check-ins by hour of day.
 * Thin columns (max 24px) with a 4px rounded top and a square baseline, hairline solid grid,
 * the peak is the only direct label, every column has a hover/focus tooltip, and a table view
 * carries the same numbers for anyone who can't use the chart.
 */
export default function PeakChart({ hours }: { hours: Hour[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...hours.map((x) => x.n));
  const top = niceMax(max);
  const peak = max > 0 ? hours.reduce((a, b) => (b.n > a.n ? b : a)) : null;
  const ticks = [top, top / 2, 0];
  const pct = (n: number) => (n / top) * 100;

  return (
    <div>
      <div className="relative pb-0 pl-8 pt-7">
        {/* PLOT AREA: gridlines and columns share exactly this box, so the 0 line is the columns' baseline */}
        <div className="relative h-40">
          <div className="absolute inset-0" aria-hidden>
            {ticks.map((t) => (
              <div key={t} className="absolute inset-x-0 border-t border-border" style={{ bottom: `${pct(t)}%` }}>
                <span className="absolute -left-8 -top-2 w-6 text-right text-[10px] tabular-nums text-muted">{t}</span>
              </div>
            ))}
          </div>

          <div className="absolute inset-0 flex items-end" role="group" aria-label="Check-ins by hour of day">
            {hours.map(({ h, n }, i) => {
              const isPeak = peak?.h === h;
              const left = i < 4;
              const right = i > 19;
              return (
                <div
                  key={h}
                  tabIndex={0}
                  aria-label={`${long(h)}: ${n} check-in${n === 1 ? "" : "s"}`}
                  onPointerEnter={() => setActive(h)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(h)}
                  onBlur={() => setActive(null)}
                  className="relative flex h-full flex-1 cursor-default items-end justify-center rounded-t outline-none focus-visible:bg-brand/10"
                >
                  <div
                    className="chart-bar w-[min(70%,24px)] rounded-t-[4px] bg-chart"
                    style={{
                      height: `${pct(n)}%`,
                      minHeight: n > 0 ? 3 : 0,
                      opacity: isPeak || active === h ? 1 : 0.55,
                      animationDelay: `${i * 22}ms`,
                      transition: "opacity .2s",
                    }}
                  />
                  {isPeak && active == null && (
                    <span
                      className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold"
                      style={{ bottom: `calc(${pct(n)}% + 4px)` }}
                    >
                      Peak · {n}
                    </span>
                  )}
                  {active === h && (
                    <span
                      role="tooltip"
                      style={{ bottom: `calc(${pct(n)}% + 10px)` }}
                      className={cn(
                        "pointer-events-none absolute z-10 animate-scale-in whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow-[var(--shadow-lift)]",
                        left ? "left-0" : right ? "right-0" : "left-1/2 -translate-x-1/2",
                      )}
                    >
                      <span className="block text-muted">{long(h)}</span>
                      <b className="text-sm">{n}</b> check-in{n === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* x axis labels sit BELOW the plot area */}
        <div className="flex pt-1.5 text-[10px] text-muted" aria-hidden>
          {hours.map(({ h }) => (
            <span key={h} className="flex-1 text-center">
              {h % 3 === 0 ? label(h) : ""}
            </span>
          ))}
        </div>
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs font-medium text-muted hover:text-foreground">View as table</summary>
        <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-card text-muted">
              <tr>
                <th className="px-3 py-1.5 font-medium">Hour (IST)</th>
                <th className="px-3 py-1.5 font-medium">Check-ins</th>
              </tr>
            </thead>
            <tbody>
              {hours.map(({ h, n }) => (
                <tr key={h} className="border-t border-border">
                  <td className="px-3 py-1">{long(h)}</td>
                  <td className="px-3 py-1 tabular-nums">{n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
