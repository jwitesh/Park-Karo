import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { signOutAction } from "@/app/(app)/actions";
import AppNav from "@/components/app-nav";

// Everything in this area is per-user and behind login, so there is no shared static shell to validate.
export const instant = false;

async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-[1000] border-b border-border bg-brand-dark text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <span className="font-bold">
            Where Did I <span className="text-brand">Park?</span>
          </span>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline">{session.user.name}</span>
            <form action={signOutAction}>
              <button className="rounded-md bg-white/15 px-3 py-1 hover:bg-white/25">Sign out</button>
            </form>
          </div>
        </div>
        <AppNav role={session.user.role} />
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 p-4">{children}</main>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Loading…</p>}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
