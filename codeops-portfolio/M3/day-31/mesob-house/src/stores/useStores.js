import { create } from "zustand";
import { persist } from "zustand/middleware";

import { API_ENDPOINTS } from "../lib/api";

const STORAGE_PREFIX = "mesob-house";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1567364816519-cbc9c4ffe1eb?auto=format&fit=crop&w=700&q=70";

const number = (value) => Number(String(value ?? 0).replace(/,/g, "")) || 0;

const phone = (value) => String(value ?? "").replace(/\D/g, "");

const itemKey = (item, options) =>
  `${item.id ?? item.slug ?? item.name}-${JSON.stringify(options ?? {})}`;

/* =========================================================
   CART HELPERS
========================================================= */

export const getCartTotals = (items, couponCode) => {
  const subtotal = items.reduce(
    (sum, item) => sum + number(item.price) * item.quantity,
    0,
  );

  const vat = Math.round(subtotal * 0.15);

  const discount =
    subtotal > 500 && couponCode?.trim().toUpperCase() === "GURSHA2025"
      ? 200
      : 0;

  return {
    subtotal,
    vat,
    discount,
    total: Math.max(0, subtotal + vat - discount),
  };
};

const cartItemFrom = (source, quantity = 1, options) => {
  const label = source.label ?? source.tag;

  const optionText = options
    ? Object.values(options).flat().filter(Boolean).join(" · ")
    : "";

  const sourceTags = source.tags?.map((tag) =>
    typeof tag === "string"
      ? {
          text: tag === "popular" ? "Popular Choice" : tag,
          tone: "brand",
        }
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
};

/* =========================================================
   CHECKOUT DEFAULT
========================================================= */

const initialCheckout = {
  fulfillment: "delivery",

  contact: {
    name: "",
    phone: "",
    email: "",
  },

  delivery: {
    subCity: "",
    street: "",
    landmark: "",
    timing: "",
  },

  method: "telebirr",

  telebirrPhone: "",
};

/* =========================================================
   API HELPER
========================================================= */

const fetchDishesFromApi = async (endpoint) => {
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const result = await response.json();

  return result?.data ?? [];
};

/* =========================================================
   ZUSTAND STORE
========================================================= */

export const useStore = create(
  persist(
    (set, get) => ({
      /* =====================================================
         CART
      ===================================================== */

      cartItems: [],

      cartNote: "",

      couponCode: "GURSHA2025",

      addToCart: (source, quantity = 1, options) => {
        const next = cartItemFrom(source, quantity, options);

        set((state) => {
          const existing = state.cartItems.find(
            (item) => item.key === next.key,
          );

          return {
            cartItems: existing
              ? state.cartItems.map((item) =>
                  item.key === next.key
                    ? {
                        ...item,
                        quantity: item.quantity + quantity,
                      }
                    : item,
                )
              : [...state.cartItems, next],
          };
        });
      },

      setQuantity: (key, quantity) => {
        const nextQuantity = Math.max(1, Number(quantity) || 1);

        set((state) => ({
          cartItems: state.cartItems.map((item) =>
            item.key === key
              ? {
                  ...item,
                  quantity: nextQuantity,
                }
              : item,
          ),
        }));
      },

      removeFromCart: (key) => {
        set((state) => ({
          cartItems: state.cartItems.filter((item) => item.key !== key),
        }));
      },

      clearCart: () => {
        set({
          cartItems: [],
        });
      },

      setCartNote: (cartNote) => {
        set({
          cartNote,
        });
      },

      setCouponCode: (couponCode) => {
        set({
          couponCode,
        });
      },

      /* =====================================================
         FAVORITES
      ===================================================== */

      favorites: [],

      toggleFavorite: (dish) => {
        const id = dish.id ?? dish.slug;

        set((state) => ({
          favorites: state.favorites.some((item) => item.id === id)
            ? state.favorites.filter((item) => item.id !== id)
            : [
                ...state.favorites,
                {
                  id,
                  name: dish.name ?? dish.nameEn,
                },
              ],
        }));
      },

      /* =====================================================
         AUTH / ACCOUNT
      ===================================================== */

      accounts: [],

      session: null,

      register: (values) => {
        const { accounts } = get();

        const email = values.email.trim().toLowerCase();

        const mobile = phone(values.phone);

        const exists = accounts.some(
          (account) => account.email === email || account.phone === mobile,
        );

        if (exists) {
          return {
            ok: false,
            message:
              "An account with that email or mobile number already exists.",
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

        set((state) => ({
          accounts: [...state.accounts, account],

          session: {
            name: account.fullName,
            email: account.email,
            preference: account.preference,
          },

          checkout: {
            ...state.checkout,

            contact: {
              ...state.checkout.contact,

              name: account.fullName,

              email: account.email,

              phone: values.phone,
            },

            telebirrPhone: values.phone,
          },
        }));

        return {
          ok: true,

          message: "Your Mesob House account is ready. Welcome to the table.",
        };
      },

      signIn: ({ method, email, mobile, password }) => {
        const { accounts } = get();

        const identifier =
          method === "email" ? email.trim().toLowerCase() : phone(mobile);

        const account = accounts.find((candidate) =>
          method === "email"
            ? candidate.email === identifier
            : candidate.phone === identifier,
        );

        if (!account || account.password !== password) {
          return {
            ok: false,

            message:
              "We couldn't match those sign-in details. Register first or try again.",
          };
        }

        set((state) => ({
          session: {
            name: account.fullName,

            email: account.email,

            preference: account.preference,
          },

          checkout: {
            ...state.checkout,

            contact: {
              ...state.checkout.contact,

              name: account.fullName,

              email: account.email,

              phone: account.phone,
            },

            telebirrPhone: account.phone,
          },
        }));

        return {
          ok: true,

          message: `Welcome back, ${account.fullName.split(" ")[0]}.`,
        };
      },

      socialSignIn: (provider) => {
        const name =
          provider === "Telebirr" ? "Telebirr Guest" : "Google Guest";

        set({
          session: {
            name,

            provider,
          },
        });

        return {
          ok: true,

          message: `${provider} demo sign-in complete.`,
        };
      },

      signOut: () => {
        set({
          session: null,
        });
      },

      /* =====================================================
         CHECKOUT
      ===================================================== */

      checkout: initialCheckout,

      updateCheckout: (section, values) => {
        set((state) => ({
          checkout: {
            ...state.checkout,

            [section]: {
              ...state.checkout[section],

              ...values,
            },
          },
        }));
      },

      updateCheckoutValue: (key, value) => {
        set((state) => ({
          checkout: {
            ...state.checkout,

            [key]: value,
          },
        }));
      },

      /* =====================================================
         ORDERS
      ===================================================== */

      orders: [],

      placeOrder: () => {
        const { cartItems, cartNote, couponCode, checkout, orders } = get();

        if (!cartItems.length) {
          return {
            ok: false,

            message:
              "Your basket is empty. Add dishes before confirming an order.",
          };
        }

        const totals = getCartTotals(cartItems, couponCode);

        const order = {
          id: `MH-${Date.now().toString().slice(-6)}`,

          placedAt: new Date().toISOString(),

          items: cartItems,

          note: cartNote,

          couponCode,

          checkout,

          total: totals.total,
        };

        set({
          orders: [order, ...orders],

          cartItems: [],

          cartNote: "",
        });

        return {
          ok: true,

          order,

          message: `Order ${order.id} is confirmed. Our kitchen is preparing your feast.`,
        };
      },

      /* =====================================================
         DISHES / MENU API STATE
      ===================================================== */

      dishes: [],

      specials: [],

      dishesLoading: false,

      specialsLoading: false,

      dishesError: null,

      specialsError: null,

      fetchDishes: async () => {
        set({
          dishesLoading: true,
          dishesError: null,
        });

        try {
          const dishes = await fetchDishesFromApi(API_ENDPOINTS.menu);

          set({
            dishes,
            dishesLoading: false,
          });

          return {
            ok: true,
            data: dishes,
          };
        } catch (error) {
          set({
            dishesLoading: false,

            dishesError: error?.message ?? "Failed to load menu.",
          });

          return {
            ok: false,

            error: error?.message ?? "Failed to load menu.",
          };
        }
      },

      fetchSpecials: async () => {
        set({
          specialsLoading: true,

          specialsError: null,
        });

        try {
          const specials = await fetchDishesFromApi(API_ENDPOINTS.specials);

          set({
            specials,

            specialsLoading: false,
          });

          return {
            ok: true,

            data: specials,
          };
        } catch (error) {
          set({
            specialsLoading: false,

            specialsError: error?.message ?? "Failed to load specials.",
          });

          return {
            ok: false,

            error: error?.message ?? "Failed to load specials.",
          };
        }
      },

      fetchAllDishes: async () => {
        const [menuResult, specialsResult] = await Promise.all([
          get().fetchDishes(),
          get().fetchSpecials(),
        ]);

        return {
          ok: menuResult.ok && specialsResult.ok,

          menu: menuResult,

          specials: specialsResult,
        };
      },

      refetchDishes: async () => {
        return get().fetchAllDishes();
      },

      refetchMenu: async () => {
        return get().fetchDishes();
      },

      refetchSpecials: async () => {
        return get().fetchSpecials();
      },

      /* =====================================================
         SELECTORS / DERIVED DATA
      ===================================================== */

      getTotals: () => {
        const { cartItems, couponCode } = get();

        return getCartTotals(cartItems, couponCode);
      },
    }),

    /* =======================================================
       PERSISTENCE
    ======================================================= */

    {
      name: STORAGE_PREFIX,

      partialize: (state) => ({
        cartItems: state.cartItems,

        cartNote: state.cartNote,

        couponCode: state.couponCode,

        favorites: state.favorites,

        accounts: state.accounts,

        session: state.session,

        checkout: state.checkout,

        orders: state.orders,
      }),
    },
  ),
);
