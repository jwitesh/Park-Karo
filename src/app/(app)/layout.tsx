import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Bike, LogOut } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { initials } from "@/lib/utils";
import { signOutAction } from "@/app/(app)/actions";
import AppNav, { BottomNav } from "@/components/app-nav";
import ThemeToggle from "@/components/theme-toggle";

// Everything in this area is per-user and behind login, so there is no shared static shell to validate.
export const instant = false;

const iconBtn = "relative grid h-10 w-10 place-items-center rounded-xl bg-white/12 ring-1 ring-white/15 hover:bg-white/22 sm:h-9 sm:w-9";

async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const unread = await prisma.notification.count({ where: { userId: session.user.id, readAt: null } });
  // The demo accounts are named like "Aman (Day Scholar)"; show just "Aman"
  const name = (session.user.name ?? "").replace(/\(.*?\)/g, "").trim();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="app-header sticky top-0 z-[1000] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <Link href="/discover" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-amber-400 shadow-lg shadow-brand/30">
              <Bike className="h-5 w-5 text-white" aria-hidden />
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-bold tracking-tight">
                Where Did I <span className="text-brand">Park?</span>
              </span>
              <span className="hidden text-[11px] text-white/60 sm:block">LPU · Two-wheeler parking</span>
            </span>
          </Link>

          <AppNav role={session.user.role} />

          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/notifications"
              className={iconBtn}
              aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
            >
              <Bell className="h-4 w-4" aria-hidden />
              {unread > 0 && (
                <span
                  data-testid="unread-count"
                  className="absolute -right-1 -top-1 grid min-w-[18px] animate-pop place-items-center rounded-full bg-brand px-1 text-[10px] font-bold leading-[18px] text-white shadow ring-2 ring-[#14275f]"
                >
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
            <ThemeToggle className={iconBtn} />
            <Link href="/profile" className="hidden items-center gap-2 rounded-xl py-1 pl-1 pr-2 hover:bg-white/10 sm:flex" aria-label="Your profile">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-brand to-amber-400 text-xs font-bold text-white ring-2 ring-white/25">
                {initials(name)}
              </span>
              <span className="max-w-32 truncate text-sm font-medium">{name}</span>
            </Link>
            <form action={signOutAction}>
              <button aria-label="Sign out" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/12 ring-1 ring-white/15 hover:bg-white/22 sm:h-9 sm:w-auto sm:gap-2 sm:px-3">
                <LogOut className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-32 pt-5 lg:pb-12">{children}</main>
      <BottomNav role={session.user.role} />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-6"><div className="skeleton h-10 w-48" /></div>}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
