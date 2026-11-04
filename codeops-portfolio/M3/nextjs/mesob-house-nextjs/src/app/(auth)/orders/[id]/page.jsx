import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import OrderDetailLive from "@/components/orders/OrderDetailLive";
import { getSession, requireCustomerPage } from "@/lib/auth";
import { getOrderForUser } from "@/lib/orders";

export const dynamic = "force-dynamic";

const metadata = {
  title: "Order details",
  description: "Your Mesob House order details and live status.",
  robots: { index: false, follow: false },
};

/**
 * Resolve ownership in metadata as well as in the page body. Metadata runs
 * before the response streams, so a future loading/Suspense boundary cannot
 * silently turn a wrong-customer order into a 200 soft 404.
 */
export async function generateMetadata({ params }) {
  const { id } = await params;
  const user = await getSession();
  if (user?.role === "customer") {
    const order = await getOrderForUser(user.id, id);
    if (!order) notFound();
  }
  return metadata;
}

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
