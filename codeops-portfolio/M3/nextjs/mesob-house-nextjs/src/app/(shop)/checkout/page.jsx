import Breadcrumbs from "@/components/layout/Breadcrumbs";
import OrderSteps from "@/components/checkout/OrderSteps";
import CheckoutView from "@/components/checkout/CheckoutView";
import { checkoutSteps } from "@/data/basket";
import { requirePageUser } from "@/lib/auth";

export const metadata = {
  title: "Delivery & Payment",
  description: "Choose where your feast should arrive and how you'd like to pay.",
  robots: { index: false }, // transactional page — keep it out of search results
};

// Proxy checks for a cookie; this page verifies the session before rendering.
export default async function CheckoutPage() {
  const user = await requirePageUser("/checkout");
  return (
    <div className="container">
      <div className="checkout-head">
        <Breadcrumbs
          items={[
            { label: "Home", to: "/" },
            { label: "Menu", to: "/menu" },
            { label: "Cart", to: "/cart" },
            { label: "Delivery & Payment" },
          ]}
        />
      </div>
      <OrderSteps steps={checkoutSteps} current={2} />
      <CheckoutView user={user} />
    </div>
  );
}
