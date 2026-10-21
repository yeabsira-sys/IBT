import Breadcrumbs from "@/components/layout/Breadcrumbs";
import AdminNav from "@/components/admin/AdminNav";
import AdminUsers from "@/components/admin/AdminUsers";
import { requirePageRole } from "@/lib/auth";
import { listUsers } from "@/lib/db";

export const metadata = {
  title: "Users",
  description: "Mesob House account and role management.",
  robots: { index: false, follow: false },
};

export default async function AdminUsersPage() {
  const user = await requirePageRole(["admin"], "/admin/users");
  const users = await listUsers();

  return (
    <div className="container portal-page portal-page--wide">
      <Breadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Users" }]} />
      <header className="portal-head">
        <p className="portal-eyebrow">Operations</p>
        <h1>Users</h1>
        <p>Change a role to grant kitchen or admin access. Your own admin role is protected.</p>
      </header>
      <AdminNav />
      <AdminUsers initialUsers={users} currentUserId={user.id} />
    </div>
  );
}
