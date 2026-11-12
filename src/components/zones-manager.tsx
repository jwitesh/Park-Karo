"use client";

import { useActionState } from "react";
import { Plus, TriangleAlert } from "lucide-react";
import { createZone, updateZone } from "@/app/(app)/admin/actions";
import { Field, Msg, Submit, inputCls } from "@/components/admin-ui";

export type ZoneRow = {
  id: number;
  name: string;
  blockNumber: number | null;
  capacity: number | null;
  occupied: number;
  lat: number | null;
  lng: number | null;
  isVerified: boolean;
  isActive: boolean;
  dataSource: string;
  categoryIds: number[];
};

type Category = { id: number; name: string };

export default function ZonesManager({ zones, categories }: { zones: ZoneRow[]; categories: Category[] }) {
  return (
    <div className="space-y-4">
      <NewZone />
      <p className="text-sm text-muted">
        Capacity and coordinates are placeholders until LPU confirms them. Tick <b>Verified</b> once you have checked a
        zone&apos;s real numbers. Zones without coordinates only appear in the list, not on the map.
      </p>
      <ul className="space-y-2">
        {zones.map((z) => (
          <ZoneEditor key={z.id} zone={z} categories={categories} />
        ))}
      </ul>
    </div>
  );
}

function NewZone() {
  const [state, action, pending] = useActionState(createZone, null);
  return (
    <details className="rounded-xl border border-border bg-card p-4">
      <summary className="flex cursor-pointer items-center gap-2 font-semibold">
        <Plus className="h-4 w-4" /> Add a zone
      </summary>
      <form action={action} className="mt-3 grid gap-2 sm:grid-cols-4">
        <Field label="Name">
          <input name="name" required placeholder="e.g. Block 33 Front" className={inputCls} />
        </Field>
        <Field label="Block number (optional)">
          <input name="blockNumber" type="number" min={1} className={inputCls} />
        </Field>
        <Field label="Capacity (optional)">
          <input name="capacity" type="number" min={0} className={inputCls} />
        </Field>
        <div className="flex items-end">
          <Submit pending={pending}>Create zone</Submit>
        </div>
        <div className="sm:col-span-4">
          <Msg s={state} />
        </div>
      </form>
    </details>
  );
}

function ZoneEditor({ zone: z, categories }: { zone: ZoneRow; categories: Category[] }) {
  const [state, action, pending] = useActionState(updateZone, null);

  return (
    <li>
      <details className="rounded-xl border border-border bg-card">
        <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-3">
          <span className="font-semibold">
            {z.name}
            {z.blockNumber != null && <span className="ml-2 text-xs font-normal text-muted">Block {z.blockNumber}</span>}
          </span>
          <span className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted">
              {z.occupied}/{z.capacity ?? "?"} parked
            </span>
            {!z.isActive && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-700">Inactive</span>}
            {z.isVerified ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800">Verified</span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                <TriangleAlert className="h-3 w-3" /> Unverified
              </span>
            )}
          </span>
        </summary>

        <form action={action} className="space-y-3 border-t border-border p-3">
          <input type="hidden" name="id" value={z.id} />
          <div className="grid gap-2 sm:grid-cols-4">
            <Field label="Capacity (blank = not confirmed)">
              <input name="capacity" type="number" min={0} defaultValue={z.capacity ?? ""} className={inputCls} />
            </Field>
            <Field label="Latitude">
              <input name="lat" type="number" step="any" defaultValue={z.lat ?? ""} placeholder="31.2528" className={inputCls} />
            </Field>
            <Field label="Longitude">
              <input name="lng" type="number" step="any" defaultValue={z.lng ?? ""} placeholder="75.7057" className={inputCls} />
            </Field>
            <Field label="Data source">
              <input name="dataSource" defaultValue={z.dataSource} maxLength={60} className={inputCls} />
            </Field>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="isVerified" defaultChecked={z.isVerified} /> Verified
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="isActive" defaultChecked={z.isActive} /> Active (shown to riders)
            </label>
          </div>

          <fieldset className="space-y-1">
            <legend className="text-xs font-medium text-muted">Permit categories allowed in this zone</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {categories.map((c) => (
                <label key={c.id} className="flex items-center gap-2">
                  <input type="checkbox" name="categoryId" value={c.id} defaultChecked={z.categoryIds.includes(c.id)} />
                  {c.name}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center gap-3">
            <Submit pending={pending}>Save zone</Submit>
            <Msg s={state} />
          </div>
        </form>
      </details>
    </li>
  );
}
