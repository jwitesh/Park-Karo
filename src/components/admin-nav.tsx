"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/zones", label: "Zones" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/tags", label: "RFID tags" },
  { href: "/violations", label: "Violations" },
  { href: "/admin/reports", label: "Reports" },
];

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav className="mb-4 flex flex-wrap gap-1 text-sm">
      {TABS.map((t) => {
        const active = t.exact ? path === t.href : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "rounded-full border border-border px-3 py-1",
              active ? "border-brand bg-brand text-white" : "bg-card hover:bg-background",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
