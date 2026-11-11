import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getZonesForUser } from "@/lib/zones";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ zones: await getZonesForUser(session.user.id) });
}
