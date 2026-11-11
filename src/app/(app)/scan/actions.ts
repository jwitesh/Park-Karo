"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { processManual, processScan, type ParkingResult } from "@/lib/parking";

const schema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("rfid"),
    zoneId: z.coerce.number().int().positive(),
    tagUid: z.string().min(1),
    direction: z.enum(["AUTO", "IN", "OUT"]),
  }),
  z.object({
    mode: z.literal("manual"),
    zoneId: z.coerce.number().int().positive(),
    plateNo: z.string().min(3),
    direction: z.enum(["IN", "OUT"]),
  }),
]);

export async function scanAction(_prev: ParkingResult | null, formData: FormData): Promise<ParkingResult> {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ATTENDANT" && session.user.role !== "ADMIN")) {
    return { ok: false, code: "VEHICLE_NOT_FOUND", message: "Not authorised" };
  }

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, code: "VEHICLE_NOT_FOUND", message: "Please fill in all fields" };
  }

  const d = parsed.data;
  const result =
    d.mode === "rfid"
      ? await processScan({ tagUid: d.tagUid, zoneId: d.zoneId, direction: d.direction, actorId: session.user.id })
      : await processManual({ plateNo: d.plateNo, zoneId: d.zoneId, direction: d.direction, actorId: session.user.id });

  revalidatePath("/scan");
  return result;
}
