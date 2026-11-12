"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { addVehicle, createUser, updateUser } from "@/app/(app)/admin/actions";
import { Field, Msg, Submit, inputCls } from "@/components/admin-ui";

type Role = "RIDER" | "ATTENDANT" | "ADMIN";
type Category = { id: number; name: string };

export type UserRow = {
  id: string;
  name: string;
  regNo: string | null;
  email: string | null;
  role: Role;
  categoryId: number | null;
  maxBlock: number | null;
  vehicles: string[];
};

function RoleSelect({ defaultValue }: { defaultValue?: Role }) {
  return (
    <select name="role" defaultValue={defaultValue ?? "RIDER"} className={inputCls}>
      <option value="RIDER">Rider</option>
      <option value="ATTENDANT">Attendant</option>
      <option value="ADMIN">Admin</option>
    </select>
  );
}

function CategorySelect({ categories, defaultValue }: { categories: Category[]; defaultValue?: number | null }) {
  return (
    <select name="categoryId" defaultValue={defaultValue ?? ""} className={inputCls}>
      <option value="">No category</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}

export default function UsersManager({
  users,
  categories,
  currentUserId,
}: {
  users: UserRow[];
  categories: Category[];
  currentUserId: string;
}) {
  return (
    <div className="space-y-4">
      <NewUser categories={categories} />
      <ul className="space-y-2">
        {users.map((u) => (
          <UserEditor key={u.id} user={u} categories={categories} isSelf={u.id === currentUserId} />
        ))}
      </ul>
    </div>
  );
}

function NewUser({ categories }: { categories: Category[] }) {
  const [state, action, pending] = useActionState(createUser, null);
  return (
    <details className="rounded-xl border border-border bg-card p-4">
      <summary className="flex cursor-pointer items-center gap-2 font-semibold">
        <Plus className="h-4 w-4" /> Add a user
      </summary>
      <form action={action} className="mt-3 grid gap-2 sm:grid-cols-3">
        <Field label="Full name">
          <input name="name" required className={inputCls} />
        </Field>
        <Field label="Registration number">
          <input name="regNo" className={inputCls} />
        </Field>
        <Field label="Email">
          <input name="email" type="email" className={inputCls} />
        </Field>
        <Field label="Password (min 8)">
          <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
        </Field>
        <Field label="Role">
          <RoleSelect />
        </Field>
        <Field label="Permit category">
          <CategorySelect categories={categories} />
        </Field>
        <Field label="Max block (Business Block rule, optional)">
          <input name="maxBlock" type="number" min={1} className={inputCls} />
        </Field>
        <div className="flex items-end">
          <Submit pending={pending}>Create user</Submit>
        </div>
        <div className="sm:col-span-3">
          <Msg s={state} />
        </div>
      </form>
    </details>
  );
}

function UserEditor({ user: u, categories, isSelf }: { user: UserRow; categories: Category[]; isSelf: boolean }) {
  const [state, action, pending] = useActionState(updateUser, null);
  const [vState, vAction, vPending] = useActionState(addVehicle, null);

  return (
    <li>
      <details className="rounded-xl border border-border bg-card">
        <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-3">
          <span className="font-semibold">
            {u.name}
            <span className="ml-2 text-xs font-normal text-muted">{u.regNo ?? u.email}</span>
          </span>
          <span className="flex items-center gap-2 text-xs">
            {u.vehicles.length > 0 && <span className="text-muted">{u.vehicles.join(", ")}</span>}
            <span className="rounded-full bg-background px-2 py-0.5 font-medium">{u.role}</span>
          </span>
        </summary>

        <div className="space-y-4 border-t border-border p-3">
          <form action={action} className="grid gap-2 sm:grid-cols-4">
            <input type="hidden" name="id" value={u.id} />
            <Field label="Role">
              <RoleSelect defaultValue={u.role} />
            </Field>
            <Field label="Permit category">
              <CategorySelect categories={categories} defaultValue={u.categoryId} />
            </Field>
            <Field label="Max block">
              <input name="maxBlock" type="number" min={1} defaultValue={u.maxBlock ?? ""} className={inputCls} />
            </Field>
            <Field label="New password (optional)">
              <input name="newPassword" type="password" minLength={8} autoComplete="new-password" className={inputCls} />
            </Field>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-4">
              <Submit pending={pending}>Save user</Submit>
              {isSelf && <span className="text-xs text-muted">This is you. You can&apos;t remove your own admin role.</span>}
              <Msg s={state} />
            </div>
          </form>

          <form action={vAction} className="grid gap-2 border-t border-border pt-3 sm:grid-cols-4">
            <input type="hidden" name="ownerId" value={u.id} />
            <Field label="Add vehicle: plate">
              <input name="plateNo" required placeholder="PB08AB1234" className={inputCls} />
            </Field>
            <Field label="Model">
              <input name="model" className={inputCls} />
            </Field>
            <Field label="Colour">
              <input name="colour" className={inputCls} />
            </Field>
            <div className="flex items-end">
              <Submit pending={vPending} secondary>
                Add vehicle
              </Submit>
            </div>
            <div className="sm:col-span-4">
              <Msg s={vState} />
            </div>
          </form>
        </div>
      </details>
    </li>
  );
}
