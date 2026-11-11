"use client";

import { useActionState } from "react";
import { Bike, Flag, Footprints, History, Loader2, MapPin, ShieldAlert } from "lucide-react";
import {
  reportViolation,
  saveNote,
  selfCheckIn,
  selfCheckOut,
  type ActionState,
} from "@/app/(app)/my-parking/actions";
import { cn } from "@/lib/utils";

type Vehicle = {
  id: string;
  plateNo: string;
  open: { recordId: string; zoneName: string; since: string; note: string; lat: number | null; lng: number | null } | null;
};

type Props = {
  vehicles: Vehicle[];
  allowedZones: { id: number; name: string; available: number | null }[];
  allZones: { id: number; name: string }[];
  history: { id: string; plateNo: string; zone: string; from: string; to: string }[];
  violations: { id: string; type: string; status: string; details: string; zone: string | null; at: string; fine: number | null }[];
};

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand";
const card = "rounded-xl border border-border bg-card p-4 shadow-sm";

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <p role="status" className={cn("text-sm", state.ok ? "text-green-700" : "text-red-600")}>
      {state.message}
    </p>
  );
}

function Btn({ pending, children, secondary }: { pending: boolean; children: React.ReactNode; secondary?: boolean }) {
  return (
    <button
      disabled={pending}
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60",
        secondary ? "border border-border bg-background" : "bg-brand-dark text-white",
      )}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />} {children}
    </button>
  );
}

export default function MyParkingClient({ vehicles, allowedZones, allZones, history, violations }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">My parking</h1>
        <p className="text-sm text-muted">Find your vehicle, see your history and report problems.</p>
      </div>

      {vehicles.length === 0 && (
        <p className={card}>No vehicle is registered to your account yet. Ask the admin to add one.</p>
      )}

      {vehicles.map((v) => (
        <VehicleCard key={v.id} vehicle={v} zones={allowedZones} />
      ))}

      <ReportForm zones={allZones} />

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <ShieldAlert className="h-4 w-4" /> My violations
        </h2>
        <ul className="divide-y divide-border rounded-xl border border-border bg-card text-sm">
          {violations.length === 0 && <li className="p-3 text-muted">No violations. Keep it up!</li>}
          {violations.map((x) => (
            <li key={x.id} className="space-y-1 p-3">
              <div className="flex items-center justify-between gap-2">
                <b>{x.type.replaceAll("_", " ")}</b>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    x.status === "OPEN" && "bg-red-100 text-red-800",
                    x.status === "RESOLVED" && "bg-green-100 text-green-800",
                    x.status === "FINED" && "bg-amber-100 text-amber-800",
                  )}
                >
                  {x.status}
                  {x.status === "FINED" && x.fine != null ? ` · ₹${x.fine}` : ""}
                </span>
              </div>
              <p className="text-muted">{x.details}</p>
              <p className="text-xs text-muted">
                {x.zone ? `${x.zone} · ` : ""}
                {x.at}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <History className="h-4 w-4" /> History
        </h2>
        <ul className="divide-y divide-border rounded-xl border border-border bg-card text-sm">
          {history.length === 0 && <li className="p-3 text-muted">No past parking yet.</li>}
          {history.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center justify-between gap-1 p-3">
              <span>
                <b>{h.plateNo}</b> · {h.zone}
              </span>
              <span className="text-xs text-muted">
                {h.from} → {h.to}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function VehicleCard({ vehicle, zones }: { vehicle: Vehicle; zones: Props["allowedZones"] }) {
  const [inState, inAction, inPending] = useActionState(selfCheckIn, null);
  const [outState, outAction, outPending] = useActionState(selfCheckOut, null);
  const [noteState, noteAction, notePending] = useActionState(saveNote, null);
  const open = vehicle.open;
  const hasCoords = open?.lat != null && open?.lng != null;

  return (
    <section className={cn(card, "space-y-3")}>
      <div className="flex items-center gap-2">
        <Bike className="h-5 w-5 text-brand" />
        <h2 className="font-semibold">{vehicle.plateNo}</h2>
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 text-xs font-medium",
            open ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-700",
          )}
        >
          {open ? "Parked" : "Not parked"}
        </span>
      </div>

      {open ? (
        <>
          <div className="rounded-lg bg-background p-3">
            <p className="flex items-center gap-2 text-sm text-muted">
              <MapPin className="h-4 w-4" /> Your vehicle is in
            </p>
            <p className="text-lg font-bold">{open.zoneName}</p>
            <p className="text-xs text-muted">Since {open.since}</p>
            {open.note && <p className="mt-1 text-sm">📝 {open.note}</p>}
            {hasCoords ? (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${open.lat},${open.lng}&travelmode=walking`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white"
              >
                <Footprints className="h-4 w-4" /> Walking directions
              </a>
            ) : (
              <p className="mt-2 text-xs text-amber-700">Map location for this zone is not confirmed yet.</p>
            )}
          </div>

          <form action={noteAction} className="flex gap-2">
            <input type="hidden" name="recordId" value={open.recordId} />
            <input
              name="note"
              defaultValue={open.note}
              maxLength={140}
              placeholder="Where exactly? e.g. near the 2nd pillar"
              className={inputCls}
            />
            <Btn pending={notePending} secondary>
              Save
            </Btn>
          </form>
          <Feedback state={noteState} />

          <form action={outAction}>
            <input type="hidden" name="vehicleId" value={vehicle.id} />
            <Btn pending={outPending}>I have left (check out)</Btn>
          </form>
          <Feedback state={outState} />
        </>
      ) : (
        <form action={inAction} className="space-y-2">
          <input type="hidden" name="vehicleId" value={vehicle.id} />
          <label className="block space-y-1 text-sm font-medium">
            I just parked in
            <select name="zoneId" required defaultValue="" className={inputCls}>
              <option value="" disabled>
                Choose a zone…
              </option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                  {z.available != null ? ` (${z.available} free)` : ""}
                </option>
              ))}
            </select>
          </label>
          <Btn pending={inPending}>Save my parking spot</Btn>
          <Feedback state={inState} />
        </form>
      )}
    </section>
  );
}

function ReportForm({ zones }: { zones: Props["allZones"] }) {
  const [state, action, pending] = useActionState(reportViolation, null);
  return (
    <details className={card}>
      <summary className="flex cursor-pointer items-center gap-2 font-semibold">
        <Flag className="h-4 w-4" /> Report unofficial or wrong parking
      </summary>
      <form action={action} className="mt-3 space-y-2">
        <input name="plateNo" required placeholder="Number plate, e.g. PB08XX1234" className={inputCls} />
        <select name="zoneId" defaultValue="" className={inputCls}>
          <option value="">Zone (optional)</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
        <textarea
          name="details"
          required
          minLength={5}
          maxLength={500}
          rows={3}
          placeholder="What did you see? e.g. parked in front of the fire exit"
          className={inputCls}
        />
        <Btn pending={pending}>Submit report</Btn>
        <Feedback state={state} />
      </form>
    </details>
  );
}
