"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { FaHeadset } from "react-icons/fa6";
import FulfillmentToggle from "./FulfillmentToggle";
import ContactDetailsCard from "./ContactDetailsCard";
import PromiseBanner from "./PromiseBanner";
import CheckoutSummary from "./CheckoutSummary";
import ErrorBoundary from "../error/ErrorBoundary";
import { contact, delivery, fulfillmentOptions, payment, promise } from "@/data/checkout";
import { useStore } from "@/store/appStore";
import { useToast } from "@/store/toastStore";
import { checkoutSchema } from "@/lib/schemas";
import { submitOrder } from "@/actions/order";

// Lazy-loaded: the address and payment cards sit below the fold, so their JS
// is split into separate chunks and downloaded after the page is interactive.
const CardSkeleton = () => <div className="skeleton" style={{ height: 280 }} aria-busy="true" />;
const DeliveryLocationCard = dynamic(() => import("./DeliveryLocationCard"), { loading: CardSkeleton });
const PaymentMethodCard = dynamic(() => import("./PaymentMethodCard"), { loading: CardSkeleton });

/** CheckoutView — contact, delivery and payment forms plus the live order summary. */
export default function CheckoutView({ user }) {
  const router = useRouter();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  // Prefill the recipient details from the signed-in account. Only empty
  // fields are filled so manual edits (e.g. ordering for someone else) stick.
  useEffect(() => {
    if (!user) return;
    const { checkout, updateCheckout } = useStore.getState();
    const patch = {};
    if (user.fullName && !checkout.contact.name) patch.name = user.fullName;
    if (user.phone && !checkout.contact.phone) patch.phone = user.phone;
    if (user.email && !checkout.contact.email) patch.email = user.email;
    if (Object.keys(patch).length) updateCheckout("contact", patch);
  }, [user]);

  const checkout = useStore((s) => s.checkout);
  const cartItems = useStore((s) => s.cartItems);
  const cartNote = useStore((s) => s.cartNote);
  const couponCode = useStore((s) => s.couponCode);
  const totals = useStore((s) => s.totals);
  const { updateCheckout, updateCheckoutValue, clearCart } = useStore.getState();

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleConfirm = async () => {
    const payload = {
      fulfillment: checkout.fulfillment,
      contact: checkout.contact,
      delivery: checkout.delivery,
      method: checkout.method,
      couponCode,
      note: cartNote,
      items: cartItems.map(({ id, name, price, quantity }) => ({ id: String(id), name, price, quantity })),
    };

    // Same schema, two places: instant feedback here, authoritative check on the server.
    const local = checkoutSchema.safeParse(payload);
    if (!local.success) return toast(local.error.issues[0].message, "error");

    setConfirming(true);
    try {
      const result = await submitOrder(payload); // Server Action
      if (!result.ok && result.code === "UNAUTHORIZED") {
        router.push("/sign-in?next=/checkout");
        return;
      }
      toast(result.message, result.ok ? "success" : "error");
      if (result.ok) {
        clearCart();
        router.push(`/orders/${result.order.id}`);
        router.refresh();
      }
    } catch {
      toast("We couldn't reach the kitchen. Please try again.", "error");
    } finally {
      setConfirming(false);
    }
  };

  const summaryProps = {
    eyebrow: "Habesha Feast",
    title: "Order Summary",
    editHref: "/cart",
    items: cartItems.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      description: item.description,
      image: item.image,
      tag: item.tags?.[0] ?? { text: "Dish", tone: "brand" },
    })),
    deliveringTo: {
      status: "Active Corridor",
      address: checkout.delivery.subCity,
      eta: "Estimated arrival ~35–45 mins from clay oven sealing",
    },
    costs: [
      { label: `Items Subtotal (${itemCount} item${itemCount === 1 ? "" : "s"})`, value: `ETB ${totals.subtotal.toLocaleString("en-US")}` },
      { label: "100% Teff Injera (4 Rolls)", value: "Included", tone: "positive" },
      { label: "Insulated Traditional Clay-Pak", value: "Free", tone: "positive" },
      { label: "City VAT & Tourism Levy (15%)", value: `ETB ${totals.vat.toLocaleString("en-US")}` },
      ...(totals.discount > 0 ? [{ label: "Coupon Discount", value: `− ETB ${totals.discount}`, tone: "positive" }] : []),
    ],
    total: totals.total.toLocaleString("en-US"),
    guarantee: "Guaranteed steaming hot in woven sealed carriers or 100% remade.",
    ctaLabel: confirming ? "Confirming your order…" : `Confirm Order & Pay ETB ${totals.total.toLocaleString("en-US")}`,
    support: {
      icon: <FaHeadset />,
      title: "Need Phone Support?",
      text: "Direct kitchen desk: +251 911 234 567",
      phone: "+251911234567",
    },
  };

  return (
    <>
      <FulfillmentToggle
        options={fulfillmentOptions}
        value={checkout.fulfillment}
        onChange={(value) => updateCheckoutValue("fulfillment", value)}
      />

      <div className="checkout-layout">
        <div className="checkout-main">
          <ContactDetailsCard
            badge={contact.badge}
            values={checkout.contact}
            onChange={(field, value) => updateCheckout("contact", { [field]: value })}
          />

          <ErrorBoundary>
            <DeliveryLocationCard
              badge={delivery.badge}
              subCities={delivery.subCities}
              values={checkout.delivery}
              onChange={(field, value) => updateCheckout("delivery", { [field]: value })}
              timingOptions={delivery.timingOptions}
              route={delivery.route}
            />
          </ErrorBoundary>

          <ErrorBoundary>
            <PaymentMethodCard
              telebirr={payment.telebirr}
              phone={checkout.telebirrPhone}
              onPhoneChange={(value) => updateCheckoutValue("telebirrPhone", value)}
              onVerify={() => toast(`Verification code sent to +251 ${checkout.telebirrPhone}`, "info")}
              otherMethods={payment.otherMethods}
              selectedMethod={checkout.method}
              onSelectMethod={(method) => updateCheckoutValue("method", method)}
            />
          </ErrorBoundary>

          <PromiseBanner {...promise} />
        </div>

        <CheckoutSummary {...summaryProps} onConfirm={handleConfirm} confirming={confirming} />
      </div>
    </>
  );
}
