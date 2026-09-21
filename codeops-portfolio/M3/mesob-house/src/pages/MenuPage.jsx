import { useMemo, useState } from "react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { Chip } from "../components/ui/ChipGroup";
import AsyncNotice from "../components/ui/AsyncNotice";
import MenuHero from "../components/menu/MenuHero";
import MenuDishCard from "../components/menu/MenuDishCard";
import { CommunalBanner, StickyCartBar } from "../components/menu/CommunalBanner";

import { footer, navLinks } from "../data/content";
import { categories as demoCategories, communal, dishes as demoDishes, menuHero, stickyNote } from "../data/menu";
import { useDishes } from "../context/DishesContext";
import { mapApiDishToCard } from "../lib/dishAdapters";
import { useStore } from "../context/StoreContext";
import { useToast } from "../context/ToastContext";
import useNavbarState from "../hooks/useNavbarState";

/**
 * MenuPage — search + category tabs over the full dish catalog, sourced
 * live from GET /menu (see context/DishesContext.jsx). Category tabs are
 * built from whatever categories the live data actually contains, so a new
 * category on the backend shows up here with no code change. Falls back to
 * the static demo catalog in data/menu.jsx while loading or on error.
 */
export default function MenuPage() {
  const { dishes: liveDishes, menuLoading, menuError, refetch } = useDishes();
  const { addToCart } = useStore();
  const toast = useToast();
  const { cart: navCart, user: navUser } = useNavbarState();

  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState({});

  const dishes = liveDishes.length > 0 ? liveDishes.map(mapApiDishToCard) : demoDishes;

  // Live categories come straight from the API's `category` field (already
  // human-readable, e.g. "Tibs & Grills"), so they're used as-is. The static
  // fallback keeps its own curated labels/counts from data/menu.jsx.
  const categories = useMemo(() => {
    if (liveDishes.length === 0) return demoCategories;
    const counts = new Map();
    for (const dish of dishes) {
      counts.set(dish.category, (counts.get(dish.category) ?? 0) + 1);
    }
    return [
      { value: "all", label: "All Dishes", count: dishes.length },
      ...Array.from(counts, ([value, count]) => ({ value, label: value, count })),
    ];
  }, [dishes, liveDishes.length]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return dishes.filter((dish) => {
      const matchesCategory = category === "all" || dish.category === category;
      const matchesSearch = !term || dish.name.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [dishes, category, search]);

  const handleAdd = (dish) => {
    addToCart(dish);
    toast(`Added ${dish.name} to your basket`);
    setSelected((prev) => ({ ...prev, [dish.id]: dish }));
  };

  const selectedList = Object.values(selected);
  const selectedTotal = selectedList.reduce((sum, dish) => sum + Number(dish.price), 0);

  return (
    <>
      <Navbar links={navLinks} cart={navCart} user={navUser} />

      <main className="container menu-page">
        <MenuHero {...menuHero} search={search} onSearchChange={setSearch} />

        {menuError && (
          <AsyncNotice
            variant="error"
            message="Couldn't load the live menu — showing example dishes instead."
            onRetry={refetch}
          />
        )}
        {menuLoading && liveDishes.length === 0 && (
          <AsyncNotice variant="loading" message="Loading the full menu…" />
        )}

        <div className="menu-tabs" role="group" aria-label="Filter by category">
          {categories.map((cat) => (
            <Chip key={cat.value} selected={category === cat.value} onClick={() => setCategory(cat.value)}>
              {cat.label} <span>({cat.count})</span>
            </Chip>
          ))}
        </div>

        <div className="menu-grid">
          {visible.map((dish) => (
            <MenuDishCard key={dish.id} dish={dish} onAdd={handleAdd} />
          ))}
        </div>

        <CommunalBanner {...communal} />
      </main>

      <Footer {...footer} />

      <StickyCartBar
        count={selectedList.length}
        amount={selectedTotal.toLocaleString()}
        note={stickyNote}
        ctaTo="/cart"
      />
    </>
  );
}
