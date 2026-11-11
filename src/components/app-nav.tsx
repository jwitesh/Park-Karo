"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Role = "RIDER" | "ATTENDANT" | "ADMIN";

const LINKS: { href: string; label: string; roles: Role[] }[] = [
  { href: "/discover", label: "Discover", roles: ["RIDER", "ATTENDANT", "ADMIN"] },
  { href: "/my-parking", label: "My Parking", roles: ["RIDER"] },
  { href: "/scan", label: "Scan", roles: ["ATTENDANT", "ADMIN"] },
  { href: "/violations", label: "Violations", roles: ["ATTENDANT", "ADMIN"] },
  { href: "/admin", label: "Admin", roles: ["ADMIN"] },
];

export default function AppNav({ role }: { role: Role }) {
  const path = usePathname();
  return (
    <nav className="mx-auto flex max-w-5xl gap-1 px-4 pb-2 text-sm">
      {LINKS.filter((l) => l.roles.includes(role)).map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={cn(
            "rounded-md px-3 py-1.5 hover:bg-white/10",
            path.startsWith(l.href) && "bg-brand font-semibold text-white hover:bg-brand",
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
