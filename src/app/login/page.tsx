"use client";

import { useActionState } from "react";
import { Bike, Loader2 } from "lucide-react";
import { login } from "./actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, null);

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <form action={action} className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-white">
            <Bike className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-lg font-bold leading-tight">Where Did I Park?</h1>
            <p className="text-sm text-muted">LPU Two-Wheeler Parking</p>
          </div>
        </div>

        <label className="block space-y-1 text-sm font-medium">
          Registration number or email
          <input
            name="identifier"
            required
            autoComplete="username"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-brand"
          />
        </label>
        <label className="block space-y-1 text-sm font-medium">
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-brand"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-dark px-4 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
        </button>

        <p className="rounded-lg bg-background p-3 text-xs text-muted">
          Demo logins (password <b>demo1234</b>): 12300001 (day scholar), 12300002 (hostel), FAC001 (faculty),
          GUARD001 (attendant), ADMIN001 (admin).
        </p>
      </form>
    </main>
  );
}
