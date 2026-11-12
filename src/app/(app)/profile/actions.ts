"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ActionState } from "@/lib/admin";

const schema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    next: z.string().min(8, "New password must be at least 8 characters").max(100),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, { message: "New passwords don't match" })
  .refine((d) => d.next !== d.current, { message: "New password must be different from the current one" });

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "Please sign in again" };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input" };

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { passwordHash: true } });
  if (!user || !(await bcrypt.compare(parsed.data.current, user.passwordHash))) {
    return { ok: false, message: "Current password is incorrect" };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.next, 10) },
  });
  await prisma.auditLog.create({
    data: { actorId: session.user.id, action: "CHANGE_PASSWORD", entity: "User", entityId: session.user.id },
  });
  return { ok: true, message: "Password changed" };
}
