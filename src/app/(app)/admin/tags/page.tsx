import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/admin";
import TagsManager from "@/components/tags-manager";

export const metadata = { title: "RFID tags | Admin" };
export const instant = false;

export default async function AdminTagsPage() {
  await requireAdminPage();

  const tags = await prisma.rfidTag.findMany({
    orderBy: { uid: "asc" },
    take: 300,
    include: { vehicle: { select: { plateNo: true, owner: { select: { name: true } } } } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">RFID tags</h1>
      <p className="text-sm text-muted">
        Blocked or lost tags are refused at the gate and a violation is recorded against the owner.
      </p>
      <TagsManager
        tags={tags.map((t) => ({
          id: t.id,
          uid: t.uid,
          status: t.status,
          plateNo: t.vehicle?.plateNo ?? "",
          owner: t.vehicle?.owner.name ?? "",
        }))}
      />
    </div>
  );
}
