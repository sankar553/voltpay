import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/server/authz";

/** Everything under /admin is admin-only (non-admins get a 404). Pages and actions re-check too. */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return (
    <>
      <AdminNav />
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</div>
    </>
  );
}
