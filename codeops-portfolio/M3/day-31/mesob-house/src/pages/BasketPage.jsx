import { FaMugHot, FaTruckFast } from "react-icons/fa6";
import { FiBox, FiLock, FiX } from "react-icons/fi";

import Navbar from "../components/layout/Navbar";
import Breadcrumbs from "../components/layout/Breadcrumbs";
import Footer from "../components/layout/Footer";
import BasketLineItem from "../components/basket/BasketLineItem";
import ProgressSteps from "../components/basket/ProgressSteps";
import EtiquettePanel from "../components/basket/EtiquettePanel";
import OrderLedger from "../components/basket/OrderLedger";

import { footer, navLinks } from "../data/content";
import {
  basketBreadcrumbs,
  basketGroup,
  checkoutSteps,
  deliveryBanner,
  etiquette,
} from "../data/basket";

import { useStore } from "../stores/useStores";
import { useToast } from "../context/ToastContext";
import useNavbarState from "../hooks/useNavbarState";

const JEBENA_BUNA_ADDON = {
  id: "jebena-buna-ceremony",
  name: "Jebena Buna Coffee Ceremony",
  description:
    "4:00 PM ritual roasted coffee beans with frankincense aroma, poured tableside.",
  price: 70,
  image:
    "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=300&q=70",
};

export default function BasketPage() {
  const cartItems = useStore((state) => state.cartItems);
  const cartNote = useStore((state) => state.cartNote);
  const setCartNote = useStore((state) => state.setCartNote);
  const setQuantity = useStore((state) => state.setQuantity);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const clearCart = useStore((state) => state.clearCart);
  const couponCode = useStore((state) => state.couponCode);
  const setCouponCode = useStore((state) => state.setCouponCode);
  const addToCart = useStore((state) => state.addToCart);
  const getTotals = useStore((state) => state.getTotals);

  const toast = useToast();

  const { cart: navCart, user: navUser } = useNavbarState();

  // Zustand derived totals
  const totals = getTotals();

  // BasketLineItem calls back with a dish's `id`, but the store keys
  // cart lines by `key` (id + chosen options).
  const findKey = (id) => cartItems.find((item) => item.id === id)?.key;

  const handleQuantityChange = (id, quantity) => {
    const key = findKey(id);

    if (key) {
      setQuantity(key, quantity);
    }
  };

  const handleRemove = (id) => {
    const key = findKey(id);

    if (key) {
      removeFromCart(key);
    }
  };

  const handleClearTable = () => {
    clearCart();
    toast("Basket cleared", "info");
  };

  const handleApplyCoupon = (code) => {
    const value = (code ?? "").trim();

    if (!value) return;

    setCouponCode(value);

    if (value.toUpperCase() === "GURSHA2025") {
      toast("Coupon applied — GURSHA2025", "success");
    } else {
      toast("That code didn't match — try GURSHA2025", "error");
    }
  };

  const handleAddUpsell = () => {
    addToCart(JEBENA_BUNA_ADDON);
    toast("Added Jebena Buna Coffee Ceremony to your basket");
  };

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const ledgerProps = {
    title: "Basket Ledger",

    rows: [
      {
        label: `Items Subtotal (${itemCount} item${
          itemCount === 1 ? "" : "s"
        })`,
        value: `ETB ${totals.subtotal.toLocaleString()}`,
      },

      {
        label: "100% Teff Injera (4 Rolls)",
        value: "Included",
        tone: "positive",
      },

      {
        label: "Insulated Traditional Clay-Pak",
        value: "Free",
        tone: "positive",
      },

      {
        label: "Delivery Fee (Bole Zone)",
        value: "Free",
        tone: "positive",
      },

      {
        label: "City VAT & Tourism Levy (15%)",
        value: `ETB ${totals.vat.toLocaleString()}`,
      },
    ],

    coupon:
      totals.discount > 0
        ? {
            label: `${couponCode.toUpperCase()} applied`,
            value: `− ETB ${totals.discount}`,
          }
        : undefined,

    couponPlaceholder: "Have a coupon code? Try GURSHA2025",

    onApplyCoupon: handleApplyCoupon,

    total: totals.total.toLocaleString(),

    ctaLabel: "Proceed to Delivery Checkout",
    ctaTo: "/checkout",

    exploreLabel: "Explore more dishes from our Menu",
    exploreTo: "/menu",

    trust: [
      {
        icon: <FiBox />,
        text: "Piping warm delivery in woven mesob packaging",
      },
      {
        icon: <FaTruckFast />,
        text: "Telebirr, CBE Birr, cash & card on delivery",
      },
      {
        icon: <FiLock />,
        text: "Encrypted checkout & real-time dispatcher SMS",
      },
    ],

    upsell: {
      icon: <FaMugHot />,
      title: "Adding Fresh Jebena Buna?",
      text: "Complement your feast with our 4:00 PM ritual roasted coffee beans with frankincense aroma.",
      action: "Add to order",
    },

    onAddUpsell: handleAddUpsell,
  };

  return (
    <>
      <Navbar links={navLinks} cart={navCart} user={navUser} />

      <div className="basket-banner">
        <div className="container basket-banner__inner">
          <p>
            <FaTruckFast aria-hidden="true" />
            <b>Free Highland Delivery:</b> {deliveryBanner.message}
          </p>

          <span className="basket-banner__badge">{deliveryBanner.note}</span>
        </div>
      </div>

      <main className="container">
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

        <div className="basket-layout">
          <div className="basket-main">
            <div className="basket-group__head">
              <h2>
                {basketGroup.heading}{" "}
                <span>
                  ({itemCount} handcrafted selection
                  {itemCount === 1 ? "" : "s"})
                </span>
              </h2>
              {cartItems.length > 0 && (
                <button
                  type="button"
                  className="link-quiet"
                  onClick={handleClearTable}
                >
                  <FiX aria-hidden="true" /> Clear Table
                </button>
              )}
            </div>

            <div className="basket-lines">
              {cartItems.length === 0 ? (
                <p className="basket-empty">
                  Your mesob is empty for now — head back to the menu to build
                  your feast.
                </p>
              ) : (
                cartItems.map((item) => (
                  <BasketLineItem
                    key={item.key}
                    item={item}
                    onQuantityChange={handleQuantityChange}
                    onRemove={handleRemove}
                  />
                ))
              )}
            </div>

            <EtiquettePanel
              {...etiquette}
              note={cartNote}
              onNoteChange={setCartNote}
            />
          </div>

          <OrderLedger {...ledgerProps} />
        </div>
      </main>

      <Footer {...footer} />
    </>
  );
}
