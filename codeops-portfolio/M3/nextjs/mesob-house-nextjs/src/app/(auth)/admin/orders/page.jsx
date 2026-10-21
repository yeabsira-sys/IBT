import Breadcrumbs from "@/components/layout/Breadcrumbs";
import AdminNav from "@/components/admin/AdminNav";
import AdminOrders from "@/components/admin/AdminOrders";
import { requirePageRole } from "@/lib/auth";
import { getAllOrders } from "@/lib/orders";

export const metadata = {
  title: "All orders",
  description: "Every Mesob House order.",
  robots: { index: false, follow: false },
};

export default async function AdminOrdersPage() {
  await requirePageRole(["admin"], "/admin/orders");
  const orders = await getAllOrders();

  return (
    <div className="container portal-page portal-page--wide">
      <Breadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Orders" }]} />
      <header className="portal-head">
        <p className="portal-eyebrow">Operations</p>
        <h1>All orders</h1>
        <p>Admin-only view of every customer order. Staff transitions are checked again on the server.</p>
      </header>
      <AdminNav />
      <AdminOrders initialOrders={orders} />
    </div>
  );
}
