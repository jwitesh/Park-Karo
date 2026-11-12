import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ChangePassword from "@/components/change-password";
import { cn } from "@/lib/utils";

export const metadata = { title: "Profile | Where Did I Park?" };
export const instant = false;

const ROLE_LABEL = { RIDER: "Rider", ATTENDANT: "Attendant", ADMIN: "Admin" } as const;

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      category: { select: { name: true } },
      vehicles: {
        orderBy: { plateNo: "asc" },
        include: { tags: { select: { uid: true, status: true }, orderBy: { uid: "asc" } } },
      },
    },
  });
  if (!user) redirect("/login");

  const rows: [string, string][] = [
    ["Name", user.name],
    ["Registration number", user.regNo ?? "Not set"],
    ["Email", user.email ?? "Not set"],
    ["Role", ROLE_LABEL[user.role]],
    ["Permit category", user.category?.name ?? "None"],
    ["Assigned block limit", user.maxBlock != null ? `Up to Block ${user.maxBlock}` : "No limit"],
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Profile</h1>

      <section className="rounded-xl border border-border bg-card p-4">
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted">
          To change your category, block or vehicle details, contact the parking office. They are managed by an admin.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">My vehicles and tags</h2>
        <ul className="divide-y divide-border rounded-xl border border-border bg-card text-sm">
          {user.vehicles.length === 0 && <li className="p-3 text-muted">No vehicle is registered to you.</li>}
          {user.vehicles.map((v) => (
            <li key={v.id} className="space-y-1 p-3">
              <p className="font-semibold">
                {v.plateNo}
                <span className="ml-2 text-xs font-normal text-muted">{[v.model, v.colour].filter(Boolean).join(" · ")}</span>
              </p>
              {v.tags.length === 0 ? (
                <p className="text-xs text-muted">No RFID tag linked. The guard will check you in manually.</p>
              ) : (
                <ul className="flex flex-wrap gap-2 text-xs">
                  {v.tags.map((t) => (
                    <li
                      key={t.uid}
                      className={cn(
                        "rounded-full px-2 py-0.5 font-medium",
                        t.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
                      )}
                    >
                      {t.uid} · {t.status.toLowerCase()}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Change password</h2>
        <div className="max-w-sm rounded-xl border border-border bg-card p-4">
          <ChangePassword />
        </div>
      </section>
    </div>
  );
}
