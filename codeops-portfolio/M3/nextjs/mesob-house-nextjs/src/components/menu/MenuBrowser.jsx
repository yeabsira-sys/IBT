"use client";

import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Chip } from "../ui/ChipGroup";
import MenuHero from "./MenuHero";
import MenuDishCard from "./MenuDishCard";
import FallbackNotice from "./FallbackNotice";
import { StickyCartBar } from "./CommunalBanner";
import useAddToCart from "@/hooks/useAddToCart";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { useStore } from "@/store/appStore";
import { fetcher } from "@/lib/fetcher";
import { number } from "@/lib/format";
import { menuHero, stickyNote } from "@/data/menu";

/**
 * MenuBrowser — search + category tabs over the dish list the server fetched.
 * Filters live in the URL (/menu?category=Tibs%20%26%20Grills&q=doro) so a
 * filtered menu is shareable and survives a refresh. URL updates go through
 * history.replaceState, which Next.js syncs into useSearchParams without a
 * server round trip.
 */
export default function MenuBrowser({ dishes, source }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const addToCart = useAddToCart();
  const cartItems = useStore((s) => s.cartItems);
  const subtotal = useStore((s) => s.totals.subtotal);

  const category = params.get("category") ?? "all";
  const [search, setSearch] = useState(params.get("q") ?? "");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  // One request per pause, not per keystroke: the SWR key only changes after
  // the debounced value settles. The server-rendered `dishes` remain the
  // fallback until the first search response arrives.
  const searchKey = debouncedSearch
    ? `/api/menu/search?q=${encodeURIComponent(debouncedSearch)}&category=${encodeURIComponent(category)}`
    : null;
  const { data: searchResults, isValidating } = useSWR(searchKey, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  const syncUrl = (next) => {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value && value !== "all") sp.set(key, value);
      else sp.delete(key);
    }
    const query = sp.toString();
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  };

  const categories = useMemo(() => {
    const counts = new Map();
    for (const dish of dishes) counts.set(dish.category, (counts.get(dish.category) ?? 0) + 1);
    return [
      { value: "all", label: "All Dishes", count: dishes.length },
      ...Array.from(counts, ([value, count]) => ({ value, label: value, count })),
    ];
  }, [dishes]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (debouncedSearch) {
      // If the response for this pause has not arrived yet, keep filtering
      // the server-seeded list locally rather than flashing an empty grid.
      if (searchResults?.data) return searchResults.data;
      return dishes.filter(
        (dish) => (category === "all" || dish.category === category) && dish.name.toLowerCase().includes(term),
      );
    }
    return dishes.filter(
      (dish) => category === "all" || dish.category === category,
    );
  }, [dishes, category, search, debouncedSearch, searchResults]);

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <MenuHero
        {...menuHero}
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          syncUrl({ q: value.trim() });
        }}
      />

      {source === "fallback" && <FallbackNotice what="the live menu" />}

      <div className="menu-tabs" role="group" aria-label="Filter by category">
        {categories.map((cat) => (
          <Chip key={cat.value} selected={category === cat.value} onClick={() => syncUrl({ category: cat.value })}>
            {cat.label} <span>({cat.count})</span>
          </Chip>
        ))}
      </div>

      {debouncedSearch && isValidating && (
        <p className="menu-searching" role="status">
          Searching the live menu…
        </p>
      )}

      <div className="menu-grid">
        {visible.map((dish) => (
          <MenuDishCard key={dish.id} dish={dish} onAdd={addToCart} />
        ))}
      </div>
      {visible.length === 0 && <p className="menu-empty">No dishes match your search — try another word or category.</p>}

      <StickyCartBar count={itemCount} amount={number.format(Number(subtotal) || 0)} note={stickyNote} ctaTo="/cart" />
    </>
  );
}
