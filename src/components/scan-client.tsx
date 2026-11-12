"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Loader2, Radio, TriangleAlert, XCircle, Keyboard } from "lucide-react";
import { scanAction } from "@/app/(app)/scan/actions";
import { cn } from "@/lib/utils";

type Props = {
  zones: { id: number; name: string; capacity: number | null; occupied: number }[];
  demoTags: { uid: string; plateNo: string }[];
  recent: { id: string; plateNo: string; zone: string; status: "OPEN" | "CLOSED"; method: string; at: string }[];
};

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand";

export default function ScanClient({ zones, demoTags, recent }: Props) {
  const [mode, setMode] = useState<"rfid" | "manual">("rfid");
  const [tagUid, setTagUid] = useState("");
  // Controlled so the guard's gate/zone survives the form reset React does after every submit.
  const [zoneId, setZoneId] = useState("");
  const [result, action, pending] = useActionState(scanAction, null);

  const tone = !result ? null : !result.ok ? "error" : result.code === "CHECKED_IN_FLAGGED" ? "warn" : "ok";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Gate scan</h1>
        <p className="text-sm text-muted">Simulated RFID scans and manual check-in/out for the attendant.</p>
      </div>

      <div className="flex w-fit overflow-hidden rounded-lg border border-border text-sm">
        {(
          [
            ["rfid", "RFID scan", Radio],
            ["manual", "Manual (no tag)", Keyboard],
          ] as const
        ).map(([m, label, Icon]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn("flex items-center gap-1.5 px-3 py-2", mode === m ? "bg-brand text-white" : "bg-card")}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        {/* Outside the <form> on purpose: React resets every field inside a form after each submit,
            but the guard stays at one gate, so the chosen zone must survive. It is sent via the hidden input. */}
        <label className="block space-y-1 text-sm font-medium">
          Zone
          <select className={inputCls} value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
            <option value="" disabled>
              Select the zone you are at…
            </option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name} ({z.capacity == null ? "capacity n/a" : `${z.occupied}/${z.capacity}`})
              </option>
            ))}
          </select>
        </label>

        {/* key={mode}: each mode gets fresh inputs, so text typed in one mode never leaks into the other. */}
        <form key={mode} action={action} className="space-y-3">
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="zoneId" value={zoneId} />

        {mode === "rfid" ? (
          <>
            <label className="block space-y-1 text-sm font-medium">
              Tag UID
              <input
                name="tagUid"
                value={tagUid}
                onChange={(e) => setTagUid(e.target.value)}
                required
                placeholder="e.g. TAG-0001"
                className={inputCls}
              />
            </label>
            <div className="flex flex-wrap gap-2 text-xs">
              {demoTags.map((t) => (
                <button
                  key={t.uid}
                  type="button"
                  onClick={() => setTagUid(t.uid)}
                  className="rounded-full border border-border px-3 py-2 hover:bg-background sm:py-1"
                >
                  {t.uid} · {t.plateNo}
                </button>
              ))}
            </div>
            <label className="block space-y-1 text-sm font-medium">
              Direction
              <select name="direction" className={inputCls} defaultValue="AUTO">
                <option value="AUTO">Auto (toggle in/out)</option>
                <option value="IN">Entry</option>
                <option value="OUT">Exit</option>
              </select>
            </label>
            <SubmitButton pending={pending} disabled={!zoneId} label="Simulate scan" />
          </>
        ) : (
          <>
            <label className="block space-y-1 text-sm font-medium">
              Number plate
              <input name="plateNo" required placeholder="e.g. PB08AA0001" className={inputCls} />
            </label>
            <div className="flex gap-2">
              <SubmitButton pending={pending} disabled={!zoneId} label="Check in" name="direction" value="IN" />
              <SubmitButton pending={pending} disabled={!zoneId} label="Check out" name="direction" value="OUT" variant="secondary" />
            </div>
          </>
        )}
        </form>
        {!zoneId && <p className="text-xs text-muted">Choose your zone to enable scanning.</p>}
      </div>

      {result && (
        <div
          role="status"
          className={cn(
            "flex animate-scale-in items-start gap-3 rounded-2xl border p-4 text-sm shadow-sm",
            tone === "ok" && "border-green-300 bg-green-50 text-green-900",
            tone === "warn" && "border-amber-300 bg-amber-50 text-amber-900",
            tone === "error" && "border-red-300 bg-red-50 text-red-900",
          )}
        >
          {tone === "ok" && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />}
          {tone === "warn" && <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />}
          {tone === "error" && <XCircle className="mt-0.5 h-5 w-5 shrink-0" />}
          <div>
            <p className="font-semibold">{result.message}</p>
            {result.flagged && <p>Reason: {result.flagged}</p>}
          </div>
        </div>
      )}

      <section>
        <h2 className="mb-2 font-semibold">Recent activity</h2>
        <ul className="divide-y divide-border rounded-xl border border-border bg-card text-sm">
          {recent.length === 0 && <li className="p-3 text-muted">No activity yet.</li>}
          {recent.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 p-3">
              <span>
                <b>{r.plateNo}</b> · {r.zone}
              </span>
              <span className="flex items-center gap-2 text-xs text-muted">
                {r.method}
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-medium",
                    r.status === "OPEN" ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-700",
                  )}
                >
                  {r.status === "OPEN" ? "Parked" : "Left"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SubmitButton({
  pending,
  label,
  name,
  value,
  variant = "primary",
  disabled = false,
}: {
  pending: boolean;
  disabled?: boolean;
  label: string;
  name?: string;
  value?: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      name={name}
      value={value}
      disabled={pending || disabled}
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-60",
        variant === "primary" ? "btn-grad w-full" : "flex-1 border border-border bg-background",
        name && variant === "primary" && "flex-1 w-auto",
      )}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />} {label}
    </button>
  );
}
