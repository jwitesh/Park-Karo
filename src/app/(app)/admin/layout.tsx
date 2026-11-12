import AdminNav from "@/components/admin-nav";

// Access control is enforced in each admin page and action (layouts don't re-run on every navigation).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AdminNav />
      {children}
    </div>
  );
}
