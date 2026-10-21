import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import OrderDetailLive from "@/components/orders/OrderDetailLive";
import { requireCustomerPage } from "@/lib/auth";
import { getOrderForUser } from "@/lib/orders";

export const metadata = {
  title: "Order details",
  description: "Your Mesob House order details and live status.",
  robots: { index: false, follow: false },
};

export default async function OrderDetailPage({ params }) {
  const { id } = await params;
  const user = await requireCustomerPage(`/orders/${id}`);
  const order = await getOrderForUser(user.id, id);
  if (!order) notFound();

  return (
    <div className="container portal-page">
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "Orders", to: "/orders" },
          { label: order.id },
        ]}
      />
      <OrderDetailLive initialOrder={order} />
    </div>
  );
}
