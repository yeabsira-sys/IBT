import Breadcrumbs from "@/components/layout/Breadcrumbs";
import KitchenBoard from "@/components/kitchen/KitchenBoard";
import { requirePageRole } from "@/lib/auth";
import { getKitchenOverview } from "@/lib/orders";

export const metadata = {
  title: "Kitchen queue",
  description: "Live order queue for Mesob House kitchen staff.",
  robots: { index: false, follow: false },
};

export default async function KitchenPage() {
  await requirePageRole(["employee", "admin"], "/kitchen");
  const { orders, charts } = await getKitchenOverview();

  return (
    <div className="container portal-page portal-page--wide">
      <Breadcrumbs items={[{ label: "Kitchen" }]} />
      <header className="portal-head">
        <p className="portal-eyebrow">Staff workspace</p>
        <h1>Kitchen queue</h1>
        <p>Advance tickets as they move through the pass. Customers see the same status live.</p>
      </header>
      <KitchenBoard initialOrders={orders} initialCharts={charts} />
    </div>
  );
}
