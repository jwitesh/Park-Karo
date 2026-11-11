import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ViolationsClient from "@/components/violations-client";
import { cn } from "@/lib/utils";

export const metadata = { title: "Violations | Where Did I Park?" };
export const instant = false;

const TABS = ["OPEN", "RESOLVED", "FINED", "ALL"] as const;

const fmt = (d: Date) =>
  d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default async function ViolationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user || (role !== "ATTENDANT" && role !== "ADMIN")) redirect("/discover");

  const { status } = await searchParams;
  const tab = TABS.find((t) => t === status) ?? "OPEN";

  const [violations, zones, counts] = await Promise.all([
    prisma.violation.findMany({
      where: tab === "ALL" ? {} : { status: tab },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { name: true, regNo: true } },
        reporter: { select: { name: true } },
        zone: { select: { name: true } },
      },
    }),
    prisma.zone.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.violation.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Violations</h1>
        <p className="text-sm text-muted">Log, review, resolve or fine violations.</p>
      </div>

      <nav className="flex flex-wrap gap-1 text-sm">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/violations?status=${t}`}
            className={cn(
              "rounded-full border border-border px-3 py-1",
              tab === t ? "border-brand bg-brand text-white" : "bg-card",
            )}
          >
            {t === "ALL" ? "All" : t[0] + t.slice(1).toLowerCase()}
            {t !== "ALL" && ` (${count(t)})`}
          </Link>
        ))}
      </nav>

      <ViolationsClient
        zones={zones}
        rows={violations.map((v) => ({
          id: v.id,
          type: v.type,
          status: v.status,
          details: v.details ?? "",
          zone: v.zone?.name ?? null,
          owner: v.user ? `${v.user.name}${v.user.regNo ? ` (${v.user.regNo})` : ""}` : "Unregistered vehicle",
          reporter: v.reporter?.name ?? "System",
          at: fmt(v.createdAt),
          fine: v.fineAmount,
        }))}
      />
    </div>
  );
}
