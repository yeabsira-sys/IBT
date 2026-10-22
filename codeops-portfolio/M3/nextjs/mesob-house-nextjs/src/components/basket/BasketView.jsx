"use client";

import { FaMugHot, FaTruckFast } from "react-icons/fa6";
import { FiBox, FiLock, FiX } from "react-icons/fi";
import BasketLineItem from "./BasketLineItem";
import EtiquettePanel from "./EtiquettePanel";
import OrderLedger from "./OrderLedger";
import { basketGroup, etiquette } from "@/data/basket";
import { useStore } from "@/store/appStore";
import { useToast } from "@/store/toastStore";
import useAddToCart from "@/hooks/useAddToCart";
import { etb, number } from "@/lib/format";

const JEBENA_BUNA_ADDON = {
  id: "jebena-spiced-coffee",
  name: "Jebena Buna Coffee Ceremony",
  description: "4:00 PM ritual roasted coffee beans with frankincense aroma, poured tableside.",
  price: 70,
  image: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=300&q=70",
};

/** BasketView — line items, etiquette note and the order ledger, all driven by the persisted store. */
export default function BasketView() {
  const cartItems = useStore((s) => s.cartItems);
  const cartNote = useStore((s) => s.cartNote);
  const couponCode = useStore((s) => s.couponCode);
  const totals = useStore((s) => s.totals);
  const { setCartNote, setQuantity, removeFromCart, clearCart, setCouponCode } = useStore.getState();
  const toast = useToast();
  const addToCart = useAddToCart();

  // The store keys lines by `key` (id + chosen options), so two configurations
  // of the same dish stay independent for quantity changes and removal.
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleApplyCoupon = (code) => {
    const value = (code ?? "").trim();
    if (!value) return;
    setCouponCode(value);
    if (value.toUpperCase() === "GURSHA2025") toast("Coupon applied — GURSHA2025");
    else toast("That code didn't match — try GURSHA2025", "error");
  };

  const ledgerProps = {
    title: "Basket Ledger",
    rows: [
      { label: `Items Subtotal (${itemCount} item${itemCount === 1 ? "" : "s"})`, value: etb.format(Number(totals.subtotal) || 0) },
      { label: "100% Teff Injera (4 Rolls)", value: "Included", tone: "positive" },
      { label: "Insulated Traditional Clay-Pak", value: "Free", tone: "positive" },
      { label: "Delivery Fee (Bole Zone)", value: "Free", tone: "positive" },
      { label: "City VAT & Tourism Levy (15%)", value: etb.format(Number(totals.vat) || 0) },
    ],
    coupon: totals.discount > 0 ? { label: `${couponCode.toUpperCase()} applied`, value: `− ${etb.format(Number(totals.discount) || 0)}` } : undefined,
    couponPlaceholder: "Have a coupon code? Try GURSHA2025",
    onApplyCoupon: handleApplyCoupon,
    total: number.format(Number(totals.total) || 0),
    ctaLabel: "Proceed to Delivery Checkout",
    ctaTo: "/checkout",
    exploreLabel: "Explore more dishes from our Menu",
    exploreTo: "/menu",
    trust: [
      { icon: <FiBox />, text: "Piping warm delivery in woven mesob packaging" },
      { icon: <FaTruckFast />, text: "Telebirr, CBE Birr, cash & card on delivery" },
      { icon: <FiLock />, text: "Encrypted checkout & real-time dispatcher SMS" },
    ],
    upsell: {
      icon: <FaMugHot />,
      title: "Adding Fresh Jebena Buna?",
      text: "Complement your feast with our 4:00 PM ritual roasted coffee beans with frankincense aroma.",
      action: "Add to order",
    },
    onAddUpsell: () => addToCart(JEBENA_BUNA_ADDON),
  };

  return (
    <div className="basket-layout">
      <div className="basket-main">
        <div className="basket-group__head">
          <h2>
            {basketGroup.heading} <span>({itemCount} handcrafted selection{itemCount === 1 ? "" : "s"})</span>
          </h2>
          <button
            type="button"
            className="link-quiet"
            onClick={() => {
              clearCart();
              toast("Basket cleared", "info");
            }}
          >
            <FiX aria-hidden="true" /> Clear Table
          </button>
        </div>

        <div className="basket-lines">
          {cartItems.length === 0 ? (
            <p className="basket-empty">Your mesob is empty for now — head back to the menu to build your feast.</p>
          ) : (
            cartItems.map((item) => (
              <BasketLineItem
                key={item.key}
                item={item}
                onQuantityChange={setQuantity}
                onRemove={removeFromCart}
              />
            ))
          )}
        </div>

        <EtiquettePanel {...etiquette} note={cartNote} onNoteChange={setCartNote} />
      </div>

      <OrderLedger {...ledgerProps} />
    </div>
  );
}
