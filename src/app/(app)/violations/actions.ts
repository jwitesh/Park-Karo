"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizePlate } from "@/lib/parking";
import { detectOverstays } from "@/lib/overstay";

export type ActionState = { ok: boolean; message: string } | null;

async function staffId(): Promise<string | null> {
  const s = await auth();
  const role = s?.user?.role;
  return s?.user && (role === "ATTENDANT" || role === "ADMIN") ? s.user.id : null;
}

const denied: ActionState = { ok: false, message: "Not authorised" };

const logSchema = z.object({
  plateNo: z.string().trim().min(3).max(15),
  type: z.enum(["WRONG_ZONE", "BLOCK_RULE", "UNOFFICIAL_PARKING", "OVERSTAY", "OTHER"]),
  zoneId: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().positive().optional()),
  details: z.string().trim().min(5, "Please add a short description").max(500),
});

/** Attendant logs a violation they observed. Links to the vehicle's open parking record if there is one. */
export async function logViolation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await staffId();
  if (!actor) return denied;

  const parsed = logSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input" };

  const plateNo = normalizePlate(parsed.data.plateNo);
  const vehicle = await prisma.vehicle.findUnique({
    where: { plateNo },
    include: { records: { where: { status: "OPEN" }, take: 1, select: { id: true, zoneId: true } } },
  });
  const open = vehicle?.records[0];

  const v = await prisma.violation.create({
    data: {
      type: parsed.data.type,
      details: `Plate ${plateNo}: ${parsed.data.details}`,
      userId: vehicle?.ownerId ?? null,
      reporterId: actor,
      zoneId: parsed.data.zoneId ?? open?.zoneId ?? null,
      recordId: open?.id ?? null,
    },
  });
  await prisma.auditLog.create({
    data: { actorId: actor, action: "LOG_VIOLATION", entity: "Violation", entityId: v.id, meta: { plateNo } },
  });

  revalidatePath("/violations");
  return {
    ok: true,
    message: vehicle ? "Violation logged against the vehicle's owner" : "Violation logged (plate is not registered)",
  };
}

export async function resolveViolation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await staffId();
  if (!actor) return denied;
  const id = String(formData.get("id") ?? "");

  const res = await prisma.violation.updateMany({
    where: { id, status: "OPEN" },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });
  if (!res.count) return { ok: false, message: "Violation is no longer open" };

  await prisma.auditLog.create({ data: { actorId: actor, action: "RESOLVE_VIOLATION", entity: "Violation", entityId: id } });
  revalidatePath("/violations");
  return { ok: true, message: "Resolved" };
}

export async function fineViolation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await staffId();
  if (!actor) return denied;

  const parsed = z
    .object({ id: z.string().min(1), amount: z.coerce.number().int().min(1).max(100000) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Enter a fine between ₹1 and ₹1,00,000" };

  const res = await prisma.violation.updateMany({
    where: { id: parsed.data.id, status: "OPEN" },
    data: { status: "FINED", fineAmount: parsed.data.amount, resolvedAt: new Date() },
  });
  if (!res.count) return { ok: false, message: "Violation is no longer open" };

  await prisma.auditLog.create({
    data: {
      actorId: actor,
      action: "FINE_VIOLATION",
      entity: "Violation",
      entityId: parsed.data.id,
      meta: { amount: parsed.data.amount },
    },
  });
  revalidatePath("/violations");
  return { ok: true, message: `Fined ₹${parsed.data.amount}` };
}

export async function runOverstayCheck(): Promise<ActionState> {
  const actor = await staffId();
  if (!actor) return denied;
  const n = await detectOverstays(actor);
  revalidatePath("/violations");
  return { ok: true, message: n ? `${n} overstay violation${n > 1 ? "s" : ""} created` : "No overstays found" };
}
