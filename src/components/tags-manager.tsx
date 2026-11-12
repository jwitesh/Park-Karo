"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { addTag, updateTag } from "@/app/(app)/admin/actions";
import { Field, Msg, Submit, inputCls } from "@/components/admin-ui";
import { cn } from "@/lib/utils";

type Status = "ACTIVE" | "BLOCKED" | "LOST";

export type TagRow = { id: string; uid: string; status: Status; plateNo: string; owner: string };

export default function TagsManager({ tags }: { tags: TagRow[] }) {
  const [state, action, pending] = useActionState(addTag, null);
  return (
    <div className="space-y-4">
      <details className="rounded-xl border border-border bg-card p-4">
        <summary className="flex cursor-pointer items-center gap-2 font-semibold">
          <Plus className="h-4 w-4" /> Register a tag
        </summary>
        <form action={action} className="mt-3 grid gap-2 sm:grid-cols-3">
          <Field label="Tag UID">
            <input name="uid" required placeholder="TAG-0004" className={inputCls} />
          </Field>
          <Field label="Vehicle plate (optional)">
            <input name="plateNo" placeholder="PB08AA0001" className={inputCls} />
          </Field>
          <div className="flex items-end">
            <Submit pending={pending}>Add tag</Submit>
          </div>
          <div className="sm:col-span-3">
            <Msg s={state} />
          </div>
        </form>
      </details>

      <ul className="space-y-2">
        {tags.length === 0 && <li className="rounded-xl border border-border bg-card p-4 text-muted">No tags yet.</li>}
        {tags.map((t) => (
          <TagEditor key={t.id} tag={t} />
        ))}
      </ul>
    </div>
  );
}

function TagEditor({ tag: t }: { tag: TagRow }) {
  const [state, action, pending] = useActionState(updateTag, null);
  return (
    <li className="rounded-xl border border-border bg-card p-3">
      <form action={action} className="grid items-end gap-2 sm:grid-cols-5">
        <input type="hidden" name="id" value={t.id} />
        <div className="sm:col-span-1">
          <p className="font-semibold">{t.uid}</p>
          <p className="text-xs text-muted">{t.owner || "Unassigned"}</p>
        </div>
        <Field label="Vehicle plate">
          <input name="plateNo" defaultValue={t.plateNo} placeholder="(unassigned)" className={inputCls} />
        </Field>
        <Field label="Status">
          <select
            name="status"
            defaultValue={t.status}
            className={cn(inputCls, t.status !== "ACTIVE" && "border-red-300")}
          >
            <option value="ACTIVE">Active</option>
            <option value="BLOCKED">Blocked</option>
            <option value="LOST">Lost</option>
          </select>
        </Field>
        <Submit pending={pending} secondary>
          Save
        </Submit>
        <Msg s={state} />
      </form>
    </li>
  );
}
