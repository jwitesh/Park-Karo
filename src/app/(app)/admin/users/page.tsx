import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/admin";
import UsersManager from "@/components/users-manager";

export const metadata = { title: "Users | Admin" };
export const instant = false;

export default async function AdminUsersPage() {
  const me = await requireAdminPage();

  const [users, categories] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      take: 200,
      include: { vehicles: { select: { plateNo: true }, orderBy: { plateNo: "asc" } } },
    }),
    prisma.permitCategory.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Users</h1>
      <UsersManager
        currentUserId={me.id}
        categories={categories}
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          regNo: u.regNo,
          email: u.email,
          role: u.role,
          categoryId: u.categoryId,
          maxBlock: u.maxBlock,
          vehicles: u.vehicles.map((v) => v.plateNo),
        }))}
      />
    </div>
  );
}
