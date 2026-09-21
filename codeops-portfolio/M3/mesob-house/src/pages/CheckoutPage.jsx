import { useNavigate } from "react-router-dom";
import { FaHeadset } from "react-icons/fa6";
import Navbar from "../components/layout/Navbar";
import Breadcrumbs from "../components/layout/Breadcrumbs";
import Footer from "../components/layout/Footer";
import OrderSteps from "../components/checkout/OrderSteps";
import FulfillmentToggle from "../components/checkout/FulfillmentToggle";
import ContactDetailsCard from "../components/checkout/ContactDetailsCard";
import DeliveryLocationCard from "../components/checkout/DeliveryLocationCard";
import PaymentMethodCard from "../components/checkout/PaymentMethodCard";
import PromiseBanner from "../components/checkout/PromiseBanner";
import CheckoutSummary from "../components/checkout/CheckoutSummary";

import { footer, navLinks } from "../data/content";
import { checkoutSteps as basketSteps } from "../data/basket";
import {
  contact,
  delivery,
  fulfillmentOptions,
  payment,
  promise,
} from "../data/checkout";
import { useStore } from "../context/StoreContext";
import { useToast } from "../context/ToastContext";
import useNavbarState from "../hooks/useNavbarState";

const checkoutBreadcrumbs = [
  { label: "Home", to: "/" },
  { label: "Menu", to: "/menu" },
  { label: "Cart", to: "/cart" },
  { label: "Delivery & Payment" },
];

/**
 * CheckoutPage — step 2 of the order flow (delivery details + payment).
 * Form values live in the shared store's `checkout` object so a reload (or
 * signing in, which pre-fills contact info) doesn't lose progress; the order
 * summary reflects the real cart, and confirming places a real order.
 */
export default function CheckoutPage() {
  const navigate = useNavigate();
  const { checkout, updateCheckout, updateCheckoutValue, cartItems, totals, placeOrder } = useStore();
  const toast = useToast();
  const { cart: navCart, user: navUser } = useNavbarState();

  const handleContactChange = (field, value) => updateCheckout("contact", { [field]: value });
  const handleDeliveryChange = (field, value) => updateCheckout("delivery", { [field]: value });

  const handleVerify = () => {
    toast(`Verification code sent to +251 ${checkout.telebirrPhone}`, "info");
  };

  const handleConfirm = () => {
    const result = placeOrder();
    toast(result.message, result.ok ? "success" : "error");
    if (result.ok) navigate("/");
  };

  const summaryItems = cartItems.map((item) => ({
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    description: item.description,
    image: item.image,
    tag: item.tags?.[0] ?? { text: "Dish", tone: "brand" },
  }));

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const summaryProps = {
    eyebrow: "Habesha Feast",
    title: "Order Summary",
    editHref: "/cart",
    items: summaryItems,
    deliveringTo: {
      status: "Active Corridor",
      address: checkout.delivery.subCity,
      eta: "Estimated arrival ~35–45 mins from clay oven sealing",
    },
    costs: [
      { label: `Items Subtotal (${itemCount} item${itemCount === 1 ? "" : "s"})`, value: `ETB ${totals.subtotal.toLocaleString()}` },
      { label: "100% Teff Injera (4 Rolls)", value: "Included", tone: "positive" },
      { label: "Insulated Traditional Clay-Pak", value: "Free", tone: "positive" },
      { label: "City VAT & Tourism Levy (15%)", value: `ETB ${totals.vat.toLocaleString()}` },
      ...(totals.discount > 0 ? [{ label: "Coupon Discount", value: `− ETB ${totals.discount}`, tone: "positive" }] : []),
    ],
    total: totals.total.toLocaleString(),
    guarantee: "Guaranteed steaming hot in woven sealed carriers or 100% remade.",
    ctaLabel: `Confirm Order & Pay ETB ${totals.total.toLocaleString()}`,
    support: {
      icon: <FaHeadset />,
      title: "Need Phone Support?",
      text: "Direct kitchen desk: +251 911 234 567",
      phone: "+251911234567",
    },
  };

  return (
    <>
      <Navbar links={navLinks} cart={navCart} user={navUser} />

      <main className="container">
        <div className="checkout-head">
          <Breadcrumbs items={checkoutBreadcrumbs} />
        </div>
        <OrderSteps steps={basketSteps} current={2} />

        <FulfillmentToggle
          options={fulfillmentOptions}
          value={checkout.fulfillment}
          onChange={(value) => updateCheckoutValue("fulfillment", value)}
        />

        <div className="checkout-layout">
          <div className="checkout-main">
            <ContactDetailsCard badge={contact.badge} values={checkout.contact} onChange={handleContactChange} />

            <DeliveryLocationCard
              badge={delivery.badge}
              subCities={delivery.subCities}
              values={checkout.delivery}
              onChange={handleDeliveryChange}
              timingOptions={delivery.timingOptions}
              route={delivery.route}
            />

            <PaymentMethodCard
              telebirr={payment.telebirr}
              phone={checkout.telebirrPhone}
              onPhoneChange={(value) => updateCheckoutValue("telebirrPhone", value)}
              onVerify={handleVerify}
              otherMethods={payment.otherMethods}
              selectedMethod={checkout.method}
              onSelectMethod={(method) => updateCheckoutValue("method", method)}
            />

            <PromiseBanner {...promise} />
          </div>

          <CheckoutSummary {...summaryProps} onConfirm={handleConfirm} />
        </div>
      </main>

      <Footer {...footer} />
    </>
  );
}
