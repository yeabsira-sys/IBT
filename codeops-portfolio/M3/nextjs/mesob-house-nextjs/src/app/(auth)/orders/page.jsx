import Breadcrumbs from "@/components/layout/Breadcrumbs";
import OrdersLive from "@/components/orders/OrdersLive";
import { requireCustomerPage } from "@/lib/auth";
import { getOrdersForUser } from "@/lib/orders";

export const metadata = {
  title: "Your Orders",
  description: "Track your Mesob House orders and their live kitchen status.",
  robots: { index: false, follow: false },
};

export default async function OrdersPage() {
  const user = await requireCustomerPage("/orders");
  const orders = await getOrdersForUser(user.id);

  return (
    <div className="container portal-page">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Account", to: "/account" }, { label: "Orders" }]} />
      <header className="portal-head">
        <p className="portal-eyebrow">Your table</p>
        <h1>Orders</h1>
        <p>Every order here is scoped to your account. Kitchen status updates live.</p>
      </header>
      <OrdersLive initialOrders={orders} />
    </div>
  );
}
