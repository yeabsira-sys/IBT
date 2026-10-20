"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getCartTotals } from "@/lib/pricing";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=700&q=70";

const itemKey = (item, options) => `${item.id ?? item.slug ?? item.name}-${JSON.stringify(options ?? {})}`;

function cartItemFrom(source, quantity = 1, options) {
  const label = source.label ?? source.tag;
  const optionText = options ? Object.values(options).flat().filter(Boolean).join(" · ") : "";
  const sourceTags = source.tags?.map((tag) =>
    typeof tag === "string" ? { text: tag === "popular" ? "Popular Choice" : tag, tone: "brand" } : tag,
  );
  return {
    key: itemKey(source, options),
    id: source.id ?? source.slug ?? source.name,
    name: source.name ?? source.nameEn,
    note: source.note ?? ((source.nativeName ?? source.nameAm) ? `(${source.nativeName ?? source.nameAm})` : ""),
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

const normalizeName = (value) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");

/**
 * The menu, the featured specials and the dish page all pass slightly
 * different objects for the same food. Treat two sources as the same dish
 * when they share an id/slug or the same normalised name, so adding it again
 * bumps the existing line instead of creating a duplicate.
 */
function sameDish(a, b) {
  const aIds = [a.id, a.slug].filter(Boolean).map(String);
  const bIds = [b.id, b.slug].filter(Boolean).map(String);
  if (aIds.some((id) => bIds.includes(id))) return true;
  const aName = normalizeName(a.name ?? a.nameEn);
  return Boolean(aName) && aName === normalizeName(b.name ?? b.nameEn);
}

const sameOptions = (a, b) => JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});

/** Merges persisted lines that describe the same dish with the same options. */
function mergeCartLines(items = []) {
  const merged = [];
  for (const item of items) {
    const existing = merged.find((line) => sameDish(line, item) && sameOptions(line.options, item.options));
    if (existing) existing.quantity += Number(item.quantity) || 0;
    else merged.push({ ...item });
  }
  return merged;
}

const defaultCheckout = {
  fulfillment: "delivery",
  contact: { name: "", phone: "", email: "" },
  delivery: { subCity: "", street: "", landmark: "", timing: "immediate" },
  method: "telebirr",
  telebirrPhone: "",
};

/** Demo values that older builds persisted; dropped on upgrade so forms start empty. */
const legacyCheckout = {
  contact: { name: "Abebe Bekele", phone: "911 45 7890", email: "abebe.b@example.com" },
  telebirrPhone: "911 45 7890",
  delivery: {
    street: "Behind Edna Mall, House No. 402, 3rd Floor",
    landmark: "Opposite to Boston Day Spa, entrance through dark green gate",
  },
};

const withoutLegacy = (value, fallback) => (value === fallback ? "" : (value ?? ""));

function migrateCheckout(checkout) {
  if (!checkout) return defaultCheckout;
  const contact = checkout.contact ?? {};
  const delivery = checkout.delivery ?? {};
  return {
    ...defaultCheckout,
    ...checkout,
    contact: {
      name: withoutLegacy(contact.name, legacyCheckout.contact.name),
      phone: withoutLegacy(contact.phone, legacyCheckout.contact.phone),
      email: withoutLegacy(contact.email, legacyCheckout.contact.email),
    },
    delivery: {
      subCity: withoutLegacy(delivery.subCity, "Bole Medhanialem (Near Mesob House)"),
      street: withoutLegacy(delivery.street, legacyCheckout.delivery.street),
      landmark: withoutLegacy(delivery.landmark, legacyCheckout.delivery.landmark),
      timing: delivery.timing ?? defaultCheckout.delivery.timing,
    },
    telebirrPhone: withoutLegacy(checkout.telebirrPhone, legacyCheckout.telebirrPhone),
  };
}

/**
 * useStore — the browser-owned part of the app: cart, favorites and the
 * checkout form. Accounts, sessions and orders now live on the server; the
 * persisted state deliberately contains no credentials.
 *
 * Next.js specifics: the server renders every Client Component once, where
 * there is no localStorage. `skipHydration` keeps the first client render
 * identical to the server's (empty defaults) and <StoreHydrator /> loads the
 * saved state right after mount — otherwise React would report a hydration
 * mismatch the moment a saved cart existed.
 */
export const useStore = create(
  persist(
    (set, get) => ({
      cartItems: [],
      cartNote: "",
      couponCode: "GURSHA2025",
      favorites: [],
      checkout: defaultCheckout,
      totals: getCartTotals([], "GURSHA2025"),

      addToCart: (source, quantity = 1, options) => {
        const next = cartItemFrom(source, quantity, options);
        set((state) => {
          const existing = state.cartItems.find(
            (item) => sameDish(item, next) && sameOptions(item.options, next.options),
          );
          const cartItems = existing
            ? state.cartItems.map((item) =>
                item === existing ? { ...item, quantity: item.quantity + next.quantity } : item,
              )
            : [...state.cartItems, next];
          return { cartItems, totals: getCartTotals(cartItems, state.couponCode) };
        });
      },
      setQuantity: (key, quantity) => {
        const nextQuantity = Math.max(1, Number(quantity) || 1);
        set((state) => {
          const cartItems = state.cartItems.map((item) => (item.key === key ? { ...item, quantity: nextQuantity } : item));
          return { cartItems, totals: getCartTotals(cartItems, state.couponCode) };
        });
      },
      removeFromCart: (key) =>
        set((state) => {
          const cartItems = state.cartItems.filter((item) => item.key !== key);
          return { cartItems, totals: getCartTotals(cartItems, state.couponCode) };
        }),
      clearCart: () => set((state) => ({ cartItems: [], totals: getCartTotals([], state.couponCode) })),
      setCartNote: (cartNote) => set({ cartNote }),
      setCouponCode: (couponCode) =>
        set((state) => ({ couponCode, totals: getCartTotals(state.cartItems, couponCode) })),

      toggleFavorite: (dish) => {
        const id = dish.id ?? dish.slug;
        set((state) => ({
          favorites: state.favorites.some((item) => item.id === id)
            ? state.favorites.filter((item) => item.id !== id)
            : [...state.favorites, { id, name: dish.name ?? dish.nameEn }],
        }));
      },

      updateCheckout: (section, values) =>
        set((state) => ({ checkout: { ...state.checkout, [section]: { ...state.checkout[section], ...values } } })),
      updateCheckoutValue: (key, value) => set((state) => ({ checkout: { ...state.checkout, [key]: value } })),
    }),
    {
      name: "mesob-house-store",
      version: 4,
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, version) => {
        const next = { ...persisted };
        // Version 4 moved accounts, sessions and orders to the server. Strip
        // them even from an old payload so no plaintext password survives.
        delete next.accounts;
        delete next.session;
        delete next.orders;
        if ((version ?? 0) < 4) {
          try {
            next.checkout = migrateCheckout(next.checkout);
          } catch {
            // keep whatever checkout shape was saved
          }
        }
        return next;
      },
      partialize: ({ totals, ...persisted }) => Object.fromEntries(Object.entries(persisted).filter(([, v]) => typeof v !== "function")),
      merge: (persisted, current) => {
        const next = { ...current, ...persisted };
        delete next.accounts;
        delete next.session;
        delete next.orders;
        try {
          next.cartItems = mergeCartLines(Array.isArray(next.cartItems) ? next.cartItems : []);
        } catch {
          // Never let a malformed saved cart block hydration.
          next.cartItems = Array.isArray(next.cartItems) ? next.cartItems : [];
        }
        next.totals = getCartTotals(next.cartItems, next.couponCode);
        return next;
      },
    },
  ),
);

const subscribe = (callback) => useStore.persist.onFinishHydration(callback);

/** useHydrated — false on the server and first client render, true once saved state has loaded. */
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => useStore.persist.hasHydrated(), () => false);
}
