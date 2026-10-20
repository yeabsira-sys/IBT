import Breadcrumbs from "@/components/layout/Breadcrumbs";
import AdminNav from "@/components/admin/AdminNav";
import AdminOverview from "@/components/admin/AdminOverview";
import { requirePageRole } from "@/lib/auth";
import { getAdminStats } from "@/lib/orders";

export const metadata = {
  title: "Admin overview",
  description: "Mesob House operations dashboard.",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  await requirePageRole(["admin"], "/admin");
  const stats = await getAdminStats();

  return (
    <div className="container portal-page portal-page--wide">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Account", to: "/account" }, { label: "Admin" }]} />
      <header className="portal-head">
        <p className="portal-eyebrow">Operations</p>
        <h1>Admin overview</h1>
        <p>Live order volume, revenue and account counts across the restaurant.</p>
      </header>
      <AdminNav />
      <AdminOverview initialStats={stats} />
    </div>
  );
}
