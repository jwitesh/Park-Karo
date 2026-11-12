import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, Bell, CheckCheck, ParkingSquare, ShieldAlert, Tag, type LucideIcon } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { markAllRead } from "./actions";
import { cn } from "@/lib/utils";

export const metadata = { title: "Notifications | Where Did I Park?" };
export const instant = false;

const KIND: Record<string, { icon: LucideIcon; tint: string }> = {
  VIOLATION: { icon: ShieldAlert, tint: "bg-red-500/12 text-red-600 dark:text-red-400" },
  VIOLATION_UPDATE: { icon: BadgeCheck, tint: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" },
  ZONE_FULL: { icon: ParkingSquare, tint: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  TAG: { icon: Tag, tint: "bg-blue-500/12 text-blue-600 dark:text-blue-400" },
  DEFAULT: { icon: Bell, tint: "bg-slate-500/12 text-slate-600 dark:text-slate-300" },
};

const fmt = (d: Date) =>
  d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.count({ where: { userId: session.user.id, readAt: null } }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted">{unread > 0 ? `${unread} unread` : "You're all caught up."}</p>
        </div>
        {unread > 0 && (
          <form action={markAllRead}>
            <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold">
              <CheckCheck className="h-4 w-4" /> Mark all as read
            </button>
          </form>
        )}
      </div>

      <ul className="space-y-2.5">
        {items.length === 0 && (
          <li className="animate-fade-in rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted">
            <Bell className="mx-auto mb-2 h-8 w-8 animate-float" aria-hidden />
            Nothing yet. Alerts about your parking and violations appear here.
          </li>
        )}
        {items.map((n, i) => {
          const kind = KIND[n.type] ?? KIND.DEFAULT;
          return (
            <li
              key={n.id}
              style={{ animationDelay: `${Math.min(i, 10) * 50}ms` }}
              className={cn(
                "flex animate-fade-up gap-3 rounded-2xl border bg-card p-4 text-sm",
                n.readAt ? "border-border" : "border-brand/40 bg-gradient-to-r from-brand/10 to-transparent",
              )}
            >
              <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", kind.tint)}>
                <kind.icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">
                    {!n.readAt && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-brand align-middle" aria-label="Unread" />}
                    {n.title}
                  </p>
                  <span className="shrink-0 text-xs text-muted">{fmt(n.createdAt)}</span>
                </div>
                <p className="text-muted">{n.body}</p>
                {n.link && (
                  <Link href={n.link} className="inline-block text-xs font-semibold text-accent underline dark:text-brand">
                    View
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
