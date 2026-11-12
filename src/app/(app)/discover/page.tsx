import { redirect } from "next/navigation";
import { auth } from "@/auth";
import DiscoverClient from "@/components/discover-client";
import { greeting } from "@/lib/utils";

export const metadata = { title: "Discover | Where Did I Park?" };
export const instant = false;

export default async function DiscoverPage() {
  // Same session check as every other page; it also makes this page request-time rendered like the rest.
  const session = await auth();
  if (!session?.user) redirect("/login");

  // "Aman (Day Scholar)" -> "Aman"
  const firstName = (session.user.name ?? "").replace(/\(.*?\)/g, "").trim().split(/\s+/)[0] || "there";

  return <DiscoverClient firstName={firstName} greeting={greeting()} />;
}
