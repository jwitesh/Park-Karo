import DiscoverClient from "@/components/discover-client";

export const metadata = { title: "Discover | Where Did I Park?" };
export const instant = false;

export default function DiscoverPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Find parking</h1>
        <p className="text-sm text-muted">Live availability for two-wheeler zones across campus.</p>
      </div>
      <DiscoverClient />
    </div>
  );
}
