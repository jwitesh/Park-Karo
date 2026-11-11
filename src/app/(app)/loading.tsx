export default function Loading() {
  return (
    <div className="space-y-3" aria-busy="true">
      <div className="h-7 w-48 animate-pulse rounded bg-border" />
      <div className="h-4 w-72 animate-pulse rounded bg-border" />
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-border" />
        ))}
      </div>
    </div>
  );
}
