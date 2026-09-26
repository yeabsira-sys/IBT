import { createContext, useContext, useMemo } from "react";
import useFetch from "../hooks/useFetch";
import { API_ENDPOINTS } from "../lib/api";

const DishesContext = createContext(null);

export function DishesProvider({ children }) {
  const menu = useFetch(API_ENDPOINTS.menu);
  const specials = useFetch(API_ENDPOINTS.specials);

  // Both endpoints return { status: "ok", data: [...] } — see the live shape
  // this was built against, in the /menu/specials example under lib/api.js.
  const dishes = menu.data?.data ?? [];
  const specialDishes = specials.data?.data ?? [];

  const bySlug = useMemo(() => {
    const map = new Map();
    // Specials can arrive before the full menu does, so seed from both.
    for (const dish of [...specialDishes, ...dishes]) {
      if (dish?.slug) map.set(dish.slug, dish);
    }
    return map;
  }, [dishes, specialDishes]);

  const value = useMemo(
    () => ({
      dishes,
      specials: specialDishes,
      // Combined flags for a page that only cares "is everything ready?".
      loading: menu.loading || specials.loading,
      error: menu.error || specials.error,
      // Per-endpoint flags for a page that renders each independently
      // (e.g. the home page only needs specials to have loaded).
      menuLoading: menu.loading,
      menuError: menu.error,
      specialsLoading: specials.loading,
      specialsError: specials.error,
      getDishBySlug: (slug) => bySlug.get(slug),
      refetch: () => {
        menu.refetch();
        specials.refetch();
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      dishes,
      specialDishes,
      menu.loading,
      menu.error,
      specials.loading,
      specials.error,
      bySlug,
    ],
  );

  return (
    <DishesContext.Provider value={value}>{children}</DishesContext.Provider>
  );
}

/** useDishes — read the shared menu/specials data. Must be used under DishesProvider. */
export function useDishes() {
  const ctx = useContext(DishesContext);
  if (!ctx) {
    throw new Error("useDishes must be used within a <DishesProvider>");
  }
  return ctx;
}
