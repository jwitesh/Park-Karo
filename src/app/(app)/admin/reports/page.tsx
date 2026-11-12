import { Download } from "lucide-react";
import { requireAdminPage } from "@/lib/admin";

export const metadata = { title: "Reports | Admin" };
export const instant = false;

const REPORTS = [
  { type: "violations", title: "Violations", desc: "Every violation with owner, zone, status and fine.", dated: true },
  { type: "parking", title: "Parking history", desc: "Every check-in and check-out with duration, method and vehicle.", dated: true },
  { type: "zones", title: "Zones and occupancy", desc: "Current snapshot: capacity, parked now, availability and data status.", dated: false },
];

const inputCls = "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand";

export default async function ReportsPage() {
  await requireAdminPage();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Reports</h1>
      <p className="text-sm text-muted">
        Download CSV files that open in Excel or Google Sheets. Times are in IST. Date ranges are inclusive; leave them
        empty for everything (up to 50,000 rows).
      </p>

      <ul className="space-y-3">
        {REPORTS.map((r) => (
          <li key={r.type} className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-semibold">{r.title}</h2>
            <p className="mb-3 text-sm text-muted">{r.desc}</p>
            {/* Plain GET form: the browser downloads the file, no JavaScript needed */}
            <form action={`/api/admin/export/${r.type}`} method="get" className="flex flex-wrap items-end gap-3">
              {r.dated && (
                <>
                  <label className="space-y-1 text-xs font-medium text-muted">
                    From
                    <input type="date" name="from" className={`${inputCls} block`} />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-muted">
                    To
                    <input type="date" name="to" className={`${inputCls} block`} />
                  </label>
                </>
              )}
              <button className="flex items-center gap-2 rounded-lg btn-grad px-4 py-2 text-sm font-semibold">
                <Download className="h-4 w-4" /> Download CSV
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
