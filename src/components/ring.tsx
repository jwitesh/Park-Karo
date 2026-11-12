import type { CSSProperties } from "react";

/**
 * Circular occupancy gauge. The arc is how full the zone is; its colour carries severity.
 * With no capacity the arc is omitted and the track is dashed, so "unknown" never looks like "empty".
 */
export default function Ring({
  pct,
  color,
  size = 60,
  stroke = 7,
  known = true,
  children,
}: {
  pct: number;
  color: string;
  size?: number;
  stroke?: number;
  known?: boolean;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = c * (1 - clamped / 100);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--track)"
          strokeWidth={stroke}
          strokeDasharray={known ? undefined : "3 5"}
        />
        {known && clamped > 0 && (
          <circle
            className="ring-arc"
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ "--ring-full": c } as CSSProperties}
          />
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none">{children}</div>
    </div>
  );
}
