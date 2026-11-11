import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { processScan } from "@/lib/parking";

const body = z.object({
  tagUid: z.string().min(1),
  zoneId: z.number().int().positive(),
  direction: z.enum(["AUTO", "IN", "OUT"]).default("AUTO"),
});

function validKey(provided: string | null): boolean {
  const expected = process.env.RFID_DEVICE_KEY;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Called by RFID readers (or the simulator). Authenticated with the x-device-key header. */
export async function POST(req: Request) {
  if (!validKey(req.headers.get("x-device-key"))) {
    return NextResponse.json({ error: "Invalid device key" }, { status: 401 });
  }
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
  }
  const result = await processScan({ ...parsed.data, actorId: null });
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
