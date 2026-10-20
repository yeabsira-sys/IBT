import { FaTruckFast } from "react-icons/fa6";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import ProgressSteps from "@/components/basket/ProgressSteps";
import BasketView from "@/components/basket/BasketView";
import { basketBreadcrumbs, checkoutSteps, deliveryBanner } from "@/data/basket";

export const metadata = {
  title: "Your Gursha Basket",
  description: "Review your dishes before checkout.",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <>
      <div className="basket-banner">
        <div className="container basket-banner__inner">
          <p>
            <FaTruckFast aria-hidden="true" />
            <b>Free Highland Delivery:</b> {deliveryBanner.message}
          </p>
          <span className="basket-banner__badge">{deliveryBanner.note}</span>
        </div>
      </div>

      <div className="container">
        <div className="basket-head">
          <Breadcrumbs items={basketBreadcrumbs} />
          <div className="basket-head__row">
            <div>
              <p className="section-heading__eyebrow">Communal Feasting</p>
              <h1 className="basket-head__title">Your Gursha Basket</h1>
            </div>
            <ProgressSteps steps={checkoutSteps} current={1} />
          </div>
        </div>

        <BasketView />
      </div>
    </>
  );
}
