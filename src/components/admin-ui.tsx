"use client";

import { Loader2 } from "lucide-react";
import type { ActionState } from "@/lib/admin";
import { cn } from "@/lib/utils";

export const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand";

export function Msg({ s }: { s: ActionState }) {
  if (!s) return null;
  return (
    <p role="status" className={cn("animate-slide-down text-sm", s.ok ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
      {s.message}
    </p>
  );
}

export function Submit({
  pending,
  children,
  secondary,
}: {
  pending: boolean;
  children: React.ReactNode;
  secondary?: boolean;
}) {
  return (
    <button
      disabled={pending}
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60",
        secondary ? "border border-border bg-background" : "btn-grad",
      )}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />} {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-xs font-medium text-muted">
      {label}
      {children}
    </label>
  );
}
