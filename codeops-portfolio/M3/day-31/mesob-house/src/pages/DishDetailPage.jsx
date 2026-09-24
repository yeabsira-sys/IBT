import { useEffect, useMemo, useState } from "react";

import { Link, useNavigate, useParams } from "react-router-dom";

import { FiArrowRight } from "react-icons/fi";

import Navbar from "../components/layout/Navbar";
import Breadcrumbs from "../components/layout/Breadcrumbs";
import Footer from "../components/layout/Footer";
import Button from "../components/ui/Button";
import Gallery from "../components/dish/Gallery";
import { HeritageNote, SpecSheet } from "../components/dish/HeritageNote";
import OrderPanel from "../components/dish/OrderPanel";
import PairingCard from "../components/dish/PairingCard";
import AsyncNotice from "../components/ui/AsyncNotice";

import { footer, navLinks } from "../data/content";

import {
  closingBand,
  dishBreadcrumbs,
  gallery,
  heritage,
  order,
  pairing,
  specs,
} from "../data/dish";

import { useStore } from "../stores/useStores";
import { useToast } from "../context/ToastContext";
import useNavbarState from "../hooks/useNavbarState";

/**
 * Reads a "+ETB 40" style note and returns the numeric add-on, or 0.
 */
function priceDelta(note) {
  const match = /\+ETB\s?(\d+)/.exec(note ?? "");

  return match ? Number(match[1]) : 0;
}

export default function DishDetailPage() {
  const { dishId } = useParams();
  const navigate = useNavigate();

  /* ========================================================
     DISHES FROM ZUSTAND
  ======================================================== */

  const dishes = useStore((state) => state.dishes);
  const specials = useStore((state) => state.specials);

  const menuLoading = useStore((state) => state.dishesLoading);

  const menuError = useStore((state) => state.dishesError);

  const specialsLoading = useStore((state) => state.specialsLoading);

  const specialsError = useStore((state) => state.specialsError);

  const fetchDishes = useStore((state) => state.fetchDishes);

  const fetchSpecials = useStore((state) => state.fetchSpecials);

  const refetchDishes = useStore((state) => state.refetchDishes);

  /* ========================================================
     CART / FAVORITES FROM ZUSTAND
  ======================================================== */

  const addToCart = useStore((state) => state.addToCart);

  const toggleFavorite = useStore((state) => state.toggleFavorite);

  const favorites = useStore((state) => state.favorites);

  /* ========================================================
     LOAD DISH DATA
  ======================================================== */

  useEffect(() => {
    fetchDishes();
    fetchSpecials();
  }, [fetchDishes, fetchSpecials]);

  /* ========================================================
     FIND CURRENT DISH
  ======================================================== */

  const liveDish = useMemo(() => {
    const allDishes = [...specials, ...dishes];

    return allDishes.find((item) => item?.slug === dishId);
  }, [dishes, specials, dishId]);

  /* ========================================================
     COMMON UI
  ======================================================== */

  const toast = useToast();

  const { cart: navCart, user: navUser } = useNavbarState();

  /*
   * Only the fields the API actually returns are overridden.
   *
   * The heat/injera/side-accent options, heritage note,
   * and pairings remain curated frontend content.
   */
  const orderContent = liveDish
    ? {
        ...order,

        name: liveDish.nameEn,

        note: liveDish.nameAm ? `(${liveDish.nameAm})` : order.note,

        price: String(liveDish.priceETB),

        description: liveDish.description,
      }
    : order;

  /* ========================================================
     LOCAL ORDER STATE
  ======================================================== */

  const [values, setValues] = useState(order.defaults);

  const [quantity, setQuantity] = useState(1);

  const stillLooking = (menuLoading || specialsLoading) && !liveDish;

  /*
   * A dish detail page always has a real dish id:
   * the live slug when the API resolved one, otherwise
   * the URL parameter used by the demo content.
   */
  const currentDishId = liveDish?.slug ?? dishId;

  const isFavorite = favorites.some((item) => item.id === currentDishId);

  /* ========================================================
     OPTIONS
  ======================================================== */

  const handleGroupChange = (key, value) => {
    setValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  /*
   * Turns:
   *
   * {
   *   heat: "traditional",
   *   sides: ["ayib"]
   * }
   *
   * into:
   *
   * {
   *   heat: "Traditional",
   *   sides: ["Fresh Ayib"]
   * }
   *
   * and calculates any "+ETB NN" option deltas.
   */
  const { selectionTitles, optionDelta } = order.groups.reduce(
    (acc, group) => {
      const selected = values[group.key];

      const chosen = Array.isArray(selected) ? selected : [selected];

      const titles = [];

      for (const value of chosen) {
        const option = group.options.find((item) => item.value === value);

        if (!option) continue;

        titles.push(option.title);

        acc.optionDelta += priceDelta(option.note);
      }

      acc.selectionTitles[group.key] = Array.isArray(selected)
        ? titles
        : titles[0];

      return acc;
    },
    {
      selectionTitles: {},
      optionDelta: 0,
    },
  );

  /* ========================================================
     CART ITEM
  ======================================================== */

  const unitPrice = Number(orderContent.price) + optionDelta;

  const dishForCart = {
    id: currentDishId,

    name: orderContent.name,

    note: orderContent.note,

    price: unitPrice,

    description: orderContent.description,

    image: gallery.images[0],
  };

  /* ========================================================
     ADD TO ORDER
  ======================================================== */

  const handleAddToOrder = () => {
    addToCart(dishForCart, quantity, selectionTitles);

    toast(`Added ${quantity} × ${orderContent.name} to your basket`);
  };

  /* ========================================================
     FAVORITES
  ======================================================== */

  const handleSaveFavorite = () => {
    toggleFavorite({
      id: currentDishId,
      name: orderContent.name,
    });

    toast(isFavorite ? "Removed from favorites" : "Saved to favorites");
  };

  /* ========================================================
     GROUP ORDER
  ======================================================== */

  const handleOrderAsGroup = () => {
    addToCart(dishForCart, quantity, {
      ...selectionTitles,
      presentation: "Group Mesob Feast",
    });

    toast("Added as a group feast — check your basket");

    navigate("/cart");
  };

  /* ========================================================
     PAIRING
  ======================================================== */

  const handleAddPairing = (item) => {
    addToCart(item);

    toast(`Added ${item.name} to your basket`);
  };

  /* ========================================================
     RENDER
  ======================================================== */

  return (
    <>
      <Navbar links={navLinks} cart={navCart} user={navUser} />

      <main className="container">
        <Breadcrumbs items={dishBreadcrumbs} />

        {(menuError || specialsError) && !liveDish && (
          <AsyncNotice
            variant="error"
            message="Couldn't load live dish data — showing example details instead."
            onRetry={refetchDishes}
          />
        )}

        {stillLooking && (
          <AsyncNotice variant="loading" message="Looking up this dish…" />
        )}

        <div className="dish-detail">
          <Gallery {...gallery} />

          <OrderPanel
            {...orderContent}
            values={values}
            onGroupChange={handleGroupChange}
            quantity={quantity}
            onQuantityChange={setQuantity}
            onAddToOrder={handleAddToOrder}
            onSaveFavorite={handleSaveFavorite}
            isFavorite={isFavorite}
            onOrderAsGroup={handleOrderAsGroup}
          />
        </div>

        <HeritageNote {...heritage} />

        <SpecSheet items={specs} />

        <section className="pairing">
          <header className="pairing__head">
            <div>
              <p className="section-heading__eyebrow">{pairing.eyebrow}</p>

              <h2 className="pairing__title">{pairing.title}</h2>
            </div>

            <p className="pairing__lede">{pairing.lede}</p>
          </header>

          <div className="pairing__grid">
            {pairing.items.map((item) => (
              <PairingCard
                key={item.name}
                item={item}
                onAdd={handleAddPairing}
              />
            ))}
          </div>
        </section>

        <div className="closing-band">
          <span className="closing-band__icon" aria-hidden="true">
            {closingBand.icon}
          </span>

          <div className="closing-band__body">
            <h4>{closingBand.title}</h4>

            <p>{closingBand.text}</p>
          </div>

          <Button
            as={Link}
            to={closingBand.action.to}
            variant="outline"
            rightIcon={<FiArrowRight />}
          >
            {closingBand.action.label}
          </Button>
        </div>
      </main>

      <Footer {...footer} />
    </>
  );
}
