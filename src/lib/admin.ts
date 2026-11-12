import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type ActionState = { ok: boolean; message: string } | null;

/** Use at the top of every admin page: redirects anyone who is not an admin. */
export async function requireAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/discover");
  return session.user;
}

/** Use at the top of every admin server action: returns the admin's id, or null. */
export async function adminIdOrNull(): Promise<string | null> {
  const session = await auth();
  return session?.user?.role === "ADMIN" ? session.user.id : null;
}
