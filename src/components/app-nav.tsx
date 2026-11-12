"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, LayoutDashboard, ParkingSquare, ScanLine, ShieldAlert, UserRound, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "RIDER" | "ATTENDANT" | "ADMIN";

const LINKS: { href: string; label: string; icon: LucideIcon; roles: Role[] }[] = [
  { href: "/discover", label: "Discover", icon: Compass, roles: ["RIDER", "ATTENDANT", "ADMIN"] },
  { href: "/my-parking", label: "My Parking", icon: ParkingSquare, roles: ["RIDER"] },
  { href: "/scan", label: "Scan", icon: ScanLine, roles: ["ATTENDANT", "ADMIN"] },
  { href: "/violations", label: "Violations", icon: ShieldAlert, roles: ["ATTENDANT", "ADMIN"] },
  { href: "/admin", label: "Admin", icon: LayoutDashboard, roles: ["ADMIN"] },
  { href: "/profile", label: "Profile", icon: UserRound, roles: ["RIDER", "ATTENDANT", "ADMIN"] },
];

function useLinks(role: Role) {
  const path = usePathname();
  return LINKS.filter((l) => l.roles.includes(role)).map((l) => ({ ...l, active: path.startsWith(l.href) }));
}

/** Desktop navigation: pills inside the header. Hidden on phones/tablets (see BottomNav). */
export default function AppNav({ role }: { role: Role }) {
  const links = useLinks(role);
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={l.active ? "page" : undefined}
          className={cn(
            "flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium",
            l.active
              ? "bg-white text-brand-dark shadow-md shadow-black/20"
              : "text-white/75 hover:bg-white/10 hover:text-white",
          )}
        >
          <l.icon className="h-4 w-4" aria-hidden />
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

/** Phone/tablet navigation: a floating tab bar like a native app. */
export function BottomNav({ role }: { role: Role }) {
  const links = useLinks(role);
  return (
    <nav
      aria-label="Main"
      className="glass safe-bottom fixed inset-x-3 bottom-3 z-[1100] flex animate-fade-up rounded-2xl border border-border px-1.5 pt-1.5 shadow-[0_18px_40px_-12px_rgb(8_16_60/0.55)] lg:hidden"
    >
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={l.active ? "page" : undefined}
          className={cn(
            "group flex min-h-[54px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium",
            l.active ? "text-foreground" : "text-muted hover:text-foreground",
          )}
        >
          <span
            className={cn(
              "grid h-8 w-12 place-items-center rounded-full transition-all duration-300",
              l.active ? "animate-pop bg-brand text-white shadow-lg shadow-brand/40" : "group-active:scale-90",
            )}
          >
            <l.icon className="h-[18px] w-[18px]" aria-hidden />
          </span>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
