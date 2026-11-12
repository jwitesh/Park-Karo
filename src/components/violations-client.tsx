"use client";

import { useActionState } from "react";
import { Clock, Loader2, Plus } from "lucide-react";
import {
  fineViolation,
  logViolation,
  resolveViolation,
  runOverstayCheck,
  type ActionState,
} from "@/app/(app)/violations/actions";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  type: string;
  status: "OPEN" | "RESOLVED" | "FINED";
  details: string;
  zone: string | null;
  owner: string;
  reporter: string;
  at: string;
  fine: number | null;
};

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand";

function Msg({ s }: { s: ActionState }) {
  if (!s) return null;
  return (
    <p role="status" className={cn("animate-slide-down text-sm", s.ok ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
      {s.message}
    </p>
  );
}

function Spinner({ on }: { on: boolean }) {
  return on ? <Loader2 className="h-4 w-4 animate-spin" /> : null;
}

export default function ViolationsClient({ rows, zones }: { rows: Row[]; zones: { id: number; name: string }[] }) {
  const [logState, logAction, logPending] = useActionState(logViolation, null);
  const [checkState, checkAction, checkPending] = useActionState(runOverstayCheck, null);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <details className="rounded-xl border border-border bg-card p-4">
          <summary className="flex cursor-pointer items-center gap-2 font-semibold">
            <Plus className="h-4 w-4" /> Log a violation
          </summary>
          <form action={logAction} className="mt-3 space-y-2">
            <input name="plateNo" required placeholder="Number plate" className={inputCls} />
            <select name="type" defaultValue="UNOFFICIAL_PARKING" className={inputCls}>
              <option value="UNOFFICIAL_PARKING">Unofficial parking</option>
              <option value="WRONG_ZONE">Wrong zone</option>
              <option value="BLOCK_RULE">Block rule</option>
              <option value="OVERSTAY">Overstay</option>
              <option value="OTHER">Other</option>
            </select>
            <select name="zoneId" defaultValue="" className={inputCls}>
              <option value="">Zone (optional)</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
            <textarea name="details" required minLength={5} maxLength={500} rows={2} placeholder="What happened?" className={inputCls} />
            <button
              disabled={logPending}
              className="flex items-center gap-2 rounded-lg btn-grad px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              <Spinner on={logPending} /> Log violation
            </button>
            <Msg s={logState} />
          </form>
        </details>

        <div className="space-y-2 rounded-xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Clock className="h-4 w-4" /> Overstay check
          </h2>
          <p className="text-sm text-muted">
            Flags parked vehicles that broke the overnight or maximum-stay rule. Hostel residents and VIP vehicles are
            exempt. Safe to run repeatedly.
          </p>
          <form action={checkAction}>
            <button
              disabled={checkPending}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              <Spinner on={checkPending} /> Run check now
            </button>
          </form>
          <Msg s={checkState} />
        </div>
      </div>

      <ul className="space-y-3">
        {rows.length === 0 && <li className="rounded-xl border border-border bg-card p-4 text-muted">Nothing here.</li>}
        {rows.map((r) => (
          <ViolationRow key={r.id} r={r} />
        ))}
      </ul>
    </div>
  );
}

function ViolationRow({ r }: { r: Row }) {
  const [resolveState, resolveAction, resolving] = useActionState(resolveViolation, null);
  const [fineState, fineAction, fining] = useActionState(fineViolation, null);

  return (
    <li className="space-y-2 rounded-xl border border-border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <b>{r.type.replaceAll("_", " ")}</b>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            r.status === "OPEN" && "bg-red-100 text-red-800",
            r.status === "RESOLVED" && "bg-green-100 text-green-800",
            r.status === "FINED" && "bg-amber-100 text-amber-800",
          )}
        >
          {r.status}
          {r.status === "FINED" && r.fine != null ? ` · ₹${r.fine}` : ""}
        </span>
      </div>
      <p>{r.details}</p>
      <p className="text-xs text-muted">
        {r.owner} · {r.zone ?? "No zone"} · reported by {r.reporter} · {r.at}
      </p>

      {r.status === "OPEN" && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <form action={resolveAction}>
            <input type="hidden" name="id" value={r.id} />
            <button
              disabled={resolving}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 font-semibold disabled:opacity-60"
            >
              <Spinner on={resolving} /> Resolve
            </button>
          </form>
          <form action={fineAction} className="flex items-center gap-2">
            <input type="hidden" name="id" value={r.id} />
            <input
              name="amount"
              type="number"
              min={1}
              max={100000}
              required
              placeholder="₹ fine"
              className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 outline-none focus:ring-2 focus:ring-brand"
            />
            <button
              disabled={fining}
              className="flex items-center gap-2 rounded-lg bg-brand px-3 py-1.5 font-semibold text-white disabled:opacity-60"
            >
              <Spinner on={fining} /> Fine
            </button>
          </form>
        </div>
      )}
      <Msg s={resolveState} />
      <Msg s={fineState} />
    </li>
  );
}
