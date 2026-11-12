import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export type NotificationInput = {
  type: string;
  title: string;
  body: string;
  link?: string;
};

/** Create one notification per distinct, non-empty user id. Pass `tx` to join a transaction. */
export async function notify(db: Db, userIds: Array<string | null | undefined>, n: NotificationInput): Promise<void> {
  const ids = [...new Set(userIds.filter((id): id is string => !!id))];
  if (ids.length === 0) return;
  await db.notification.createMany({
    data: ids.map((userId) => ({ userId, type: n.type, title: n.title, body: n.body, link: n.link ?? null })),
  });
}

/** Attendants and admins, for operational alerts such as "zone is full". */
export async function staffIds(db: Db): Promise<string[]> {
  const staff = await db.user.findMany({ where: { role: { in: ["ADMIN", "ATTENDANT"] } }, select: { id: true } });
  return staff.map((s) => s.id);
}

const VIOLATION_LABEL: Record<string, string> = {
  WRONG_ZONE: "Wrong zone",
  BLOCK_RULE: "Block rule",
  UNOFFICIAL_PARKING: "Unofficial parking",
  OVERSTAY: "Overstay",
  TAG_MISMATCH: "Tag problem",
  OTHER: "Violation",
};

export const violationLabel = (type: string) => VIOLATION_LABEL[type] ?? "Violation";
