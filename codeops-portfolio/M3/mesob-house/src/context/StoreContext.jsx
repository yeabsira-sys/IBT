import { createContext, useContext, useEffect, useState } from "react";

const StoreContext = createContext(null);
const STORAGE_PREFIX = "mesob-house:";
const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1567364816519-cbc9c4ffe1eb?auto=format&fit=crop&w=700&q=70";

function read(key, fallback) {
  try {
    const value = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function useStoredState(key, fallback) {
  const [value, setValue] = useState(() => read(key, fallback));
  useEffect(() => {
    window.localStorage.setItem(
      `${STORAGE_PREFIX}${key}`,
      JSON.stringify(value),
    );
  }, [key, value]);
  return [value, setValue];
}

const number = (value) => Number(String(value ?? 0).replace(/,/g, "")) || 0;
const phone = (value) => String(value ?? "").replace(/\D/g, "");
const itemKey = (item, options) =>
  `${item.id ?? item.slug ?? item.name}-${JSON.stringify(options ?? {})}`;

// eslint-disable-next-line react-refresh/only-export-components
export function getCartTotals(items, couponCode) {
  const subtotal = items.reduce(
    (sum, item) => sum + number(item.price) * item.quantity,
    0,
  );
  // Injera and packaging are complimentary with every order, not paid
  // add-ons — they should never change the total on their own.
  const injera = 0;
  const packaging = 0;
  const vat = Math.round(subtotal * 0.15);
  const discount =
    subtotal > 500
      ? couponCode?.trim().toUpperCase() === "GURSHA2025"
        ? 200
        : 0
      : 0;
  return {
    subtotal,
    injera,
    packaging,
    vat,
    discount,
    total: Math.max(0, subtotal + vat - discount),
  };
}

function cartItemFrom(source, quantity = 1, options) {
  const label = source.label ?? source.tag;
  const optionText = options
    ? Object.values(options).flat().filter(Boolean).join(" · ")
    : "";
  const sourceTags = source.tags?.map((tag) =>
    typeof tag === "string"
      ? { text: tag === "popular" ? "Popular Choice" : tag, tone: "brand" }
      : tag,
  );
  return {
    key: itemKey(source, options),
    id: source.id ?? source.slug ?? source.name,
    name: source.name ?? source.nameEn,
    note:
      source.note ??
      ((source.nativeName ?? source.nameAm)
        ? `(${source.nativeName ?? source.nameAm})`
        : ""),
    price: String(source.price ?? source.priceETB ?? 0),
    quantity,
    description: optionText
      ? `${source.description ?? ""} · ${optionText}`
      : (source.description ?? "Prepared fresh for your table."),
    image: source.image ?? DEFAULT_IMAGE,
    tags: sourceTags ?? (label ? [label] : []),
    options,
  };
}

export function StoreProvider({ children }) {
  // A cart is customer state, never a seeded product catalog. The v2 key
  // intentionally starts clean instead of restoring the former demo basket.
  const [cartItems, setCartItems] = useStoredState("cart-v2", []);
  const [cartNote, setCartNote] = useStoredState("cart-note", "");
  const [couponCode, setCouponCode] = useStoredState("coupon", "GURSHA2025");
  const [favorites, setFavorites] = useStoredState("favorites", []);
  const [accounts, setAccounts] = useStoredState("accounts", []);
  const [session, setSession] = useStoredState("session", null);
  const [checkout, setCheckout] = useStoredState("checkout", {
    fulfillment: "delivery",
    contact: {
      name: "Abebe Bekele",
      phone: "911 45 7890",
      email: "abebe.b@example.com",
    },
    delivery: {
      subCity: "Bole Medhanialem (Near Mesob House)",
      street: "Behind Edna Mall, House No. 402, 3rd Floor",
      landmark: "Opposite to Boston Day Spa, entrance through dark green gate",
      timing: "immediate",
    },
    method: "telebirr",
    telebirrPhone: "911 45 7890",
  });
  const [orders, setOrders] = useStoredState("orders", []);

  const addToCart = (source, quantity = 1, options) => {
    const next = cartItemFrom(source, quantity, options);
    setCartItems((current) => {
      const existing = current.find((item) => item.key === next.key);
      return existing
        ? current.map((item) =>
            item.key === next.key
              ? { ...item, quantity: item.quantity + quantity }
              : item,
          )
        : [...current, next];
    });
  };

  const setQuantity = (key, quantity) => {
    const nextQuantity = Math.max(1, Number(quantity) || 1);
    setCartItems((current) =>
      current.map((item) =>
        item.key === key ? { ...item, quantity: nextQuantity } : item,
      ),
    );
  };
  const removeFromCart = (key) =>
    setCartItems((current) => current.filter((item) => item.key !== key));
  const clearCart = () => setCartItems([]);
  const toggleFavorite = (dish) => {
    const id = dish.id ?? dish.slug;
    setFavorites((current) =>
      current.some((item) => item.id === id)
        ? current.filter((item) => item.id !== id)
        : [...current, { id, name: dish.name ?? dish.nameEn }],
    );
  };

  const register = (values) => {
    const email = values.email.trim().toLowerCase();
    const mobile = phone(values.phone);
    if (
      accounts.some(
        (account) => account.email === email || account.phone === mobile,
      )
    ) {
      return {
        ok: false,
        message: "An account with that email or mobile number already exists.",
      };
    }
    const account = {
      id: crypto.randomUUID(),
      fullName: values.fullName.trim(),
      email,
      phone: mobile,
      password: values.password,
      preference: values.preference,
    };
    setAccounts((current) => [...current, account]);
    setSession({
      name: account.fullName,
      email: account.email,
      preference: account.preference,
    });
    setCheckout((current) => ({
      ...current,
      contact: {
        ...current.contact,
        name: account.fullName,
        email: account.email,
        phone: values.phone,
      },
      telebirrPhone: values.phone,
    }));
    return {
      ok: true,
      message: "Your Mesob House account is ready. Welcome to the table.",
    };
  };

  const signIn = ({ method, email, mobile, password }) => {
    const identifier =
      method === "email" ? email.trim().toLowerCase() : phone(mobile);
    const account = accounts.find((candidate) =>
      method === "email"
        ? candidate.email === identifier
        : candidate.phone === identifier,
    );
    if (!account || account.password !== password)
      return {
        ok: false,
        message:
          "We couldn't match those sign-in details. Register first or try again.",
      };
    setSession({
      name: account.fullName,
      email: account.email,
      preference: account.preference,
    });
    setCheckout((current) => ({
      ...current,
      contact: {
        ...current.contact,
        name: account.fullName,
        email: account.email,
        phone: account.phone,
      },
      telebirrPhone: account.phone,
    }));
    return {
      ok: true,
      message: `Welcome back, ${account.fullName.split(" ")[0]}.`,
    };
  };

  const socialSignIn = (provider) => {
    const name = provider === "Telebirr" ? "Telebirr Guest" : "Google Guest";
    setSession({ name, provider });
    return { ok: true, message: `${provider} demo sign-in complete.` };
  };

  const signOut = () => setSession(null);

  const updateCheckout = (section, values) =>
    setCheckout((current) => ({
      ...current,
      [section]: { ...current[section], ...values },
    }));
  const updateCheckoutValue = (key, value) =>
    setCheckout((current) => ({ ...current, [key]: value }));
  const totals = getCartTotals(cartItems, couponCode);

  const placeOrder = () => {
    if (!cartItems.length)
      return {
        ok: false,
        message: "Your basket is empty. Add dishes before confirming an order.",
      };
    const order = {
      id: `MH-${Date.now().toString().slice(-6)}`,
      placedAt: new Date().toISOString(),
      items: cartItems,
      note: cartNote,
      couponCode,
      checkout,
      total: totals.total,
    };
    setOrders((current) => [order, ...current]);
    clearCart();
    setCartNote("");
    return {
      ok: true,
      order,
      message: `Order ${order.id} is confirmed. Our kitchen is preparing your feast.`,
    };
  };

  const value = {
    cartItems,
    cartNote,
    couponCode,
    favorites,
    session,
    checkout,
    orders,
    totals,
    addToCart,
    setQuantity,
    removeFromCart,
    clearCart,
    setCartNote,
    setCouponCode,
    toggleFavorite,
    register,
    signIn,
    socialSignIn,
    signOut,
    updateCheckout,
    updateCheckoutValue,
    placeOrder,
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used within a <StoreProvider>");
  return store;
}
