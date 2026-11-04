import Breadcrumbs from "@/components/layout/Breadcrumbs";
import AdminNav from "@/components/admin/AdminNav";
import AdminMenu from "@/components/admin/AdminMenu";
import { requirePageRole } from "@/lib/auth";
import { getMenuForAdmin } from "@/lib/menu";

export const metadata = {
  title: "Menu management",
  description: "Create, edit and retire Mesob House dishes, options and pairings.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminMenuPage() {
  await requirePageRole(["admin"], "/admin/menu");
  const { items, categories } = await getMenuForAdmin();

  return (
    <div className="container portal-page portal-page--wide">
      <Breadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Menu" }]} />
      <header className="portal-head">
        <p className="portal-eyebrow">Kitchen catalogue</p>
        <h1>Menu management</h1>
        <p>
          Every dish, side, special, option group and pairing on the site comes
          from this catalogue. Prices are stored in cents and option add-ons are
          charged by the server at checkout.
        </p>
      </header>
      <AdminNav />
      <AdminMenu initialItems={items} initialCategories={categories} />
    </div>
  );
}
