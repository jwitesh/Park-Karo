import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

async function Redirector(): Promise<React.ReactNode> {
  const session = await auth();
  redirect(session?.user ? "/discover" : "/login");
}

export default function Home() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Loading…</p>}>
      <Redirector />
    </Suspense>
  );
}
