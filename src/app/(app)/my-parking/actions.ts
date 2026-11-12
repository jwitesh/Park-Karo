"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkInVehicle, checkOutVehicle, normalizePlate } from "@/lib/parking";
import { notify } from "@/lib/notify";

export type ActionState = { ok: boolean; message: string } | null;

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

const fail = (message: string): ActionState => ({ ok: false, message });

/** Rider says "I parked here" (no RFID needed). Vehicle must belong to the rider. */
export async function selfCheckIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await currentUserId();
  if (!userId) return fail("Please sign in again");

  const parsed = z
    .object({ vehicleId: z.string().min(1), zoneId: z.coerce.number().int().positive() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Choose a vehicle and a zone");

  const vehicle = await prisma.vehicle.findFirst({ where: { id: parsed.data.vehicleId, ownerId: userId } });
  if (!vehicle) return fail("Vehicle not found");

  const r = await checkInVehicle({ vehicleId: vehicle.id, zoneId: parsed.data.zoneId, method: "SELF", actorId: userId });
  revalidatePath("/my-parking");
  return { ok: r.ok, message: r.message };
}

export async function selfCheckOut(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await currentUserId();
  if (!userId) return fail("Please sign in again");

  const vehicleId = String(formData.get("vehicleId") ?? "");
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, ownerId: userId } });
  if (!vehicle) return fail("Vehicle not found");

  const r = await checkOutVehicle({ vehicleId: vehicle.id, actorId: userId });
  revalidatePath("/my-parking");
  return { ok: r.ok, message: r.message };
}

/** "Where exactly?" note, e.g. "near the second pillar". Only for your own open record. */
export async function saveNote(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await currentUserId();
  if (!userId) return fail("Please sign in again");

  const parsed = z
    .object({ recordId: z.string().min(1), note: z.string().max(140) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Note must be 140 characters or fewer");

  const res = await prisma.parkingRecord.updateMany({
    where: { id: parsed.data.recordId, status: "OPEN", vehicle: { ownerId: userId } },
    data: { note: parsed.data.note.trim() || null },
  });
  revalidatePath("/my-parking");
  return res.count ? { ok: true, message: "Note saved" } : fail("Parking record not found");
}

const reportSchema = z.object({
  plateNo: z.string().trim().min(3).max(15),
  zoneId: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().positive().optional()),
  details: z.string().trim().min(5, "Please describe what you saw").max(500),
});

/** Rider reports unofficial / wrong parking by another vehicle. */
export async function reportViolation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await currentUserId();
  if (!userId) return fail("Please sign in again");

  const parsed = reportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid report");

  // Basic abuse guard
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await prisma.violation.count({ where: { reporterId: userId, createdAt: { gte: since } } });
  if (recent >= 10) return fail("Report limit reached for today");

  const plateNo = normalizePlate(parsed.data.plateNo);
  const vehicle = await prisma.vehicle.findUnique({ where: { plateNo } });

  const violation = await prisma.violation.create({
    data: {
      type: "UNOFFICIAL_PARKING",
      details: `Plate ${plateNo}: ${parsed.data.details}`,
      userId: vehicle?.ownerId ?? null,
      reporterId: userId,
      zoneId: parsed.data.zoneId ?? null,
    },
  });
  await prisma.auditLog.create({
    data: { actorId: userId, action: "REPORT_VIOLATION", entity: "Violation", entityId: violation.id, meta: { plateNo } },
  });

  // Tell the owner of the reported vehicle (unless someone reported their own bike)
  if (vehicle && vehicle.ownerId !== userId) {
    await notify(prisma, [vehicle.ownerId], {
      type: "VIOLATION",
      title: "Your vehicle was reported",
      body: `${plateNo} was reported for unofficial or wrong parking. Security will review it.`,
      link: "/my-parking",
    });
  }

  revalidatePath("/my-parking");
  return { ok: true, message: "Report submitted. Security will review it." };
}
