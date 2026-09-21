import { useState } from "react";
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
import { useDishes } from "../context/DishesContext";
import AsyncNotice from "../components/ui/AsyncNotice";
import { useStore } from "../context/StoreContext";
import { useToast } from "../context/ToastContext";
import useNavbarState from "../hooks/useNavbarState";

/** Reads a "+ETB 40" style note and returns the numeric add-on, or 0. */
function priceDelta(note) {
  const match = /\+ETB\s?(\d+)/.exec(note ?? "");
  return match ? Number(match[1]) : 0;
}

/**
 * DishDetailPage — a single menu item's full page: gallery, heritage story,
 * configurable order panel, and pairing suggestions.
 */
export default function DishDetailPage() {
  const { dishId } = useParams();
  const navigate = useNavigate();
  const { getDishBySlug, menuLoading, specialsLoading, menuError, specialsError, refetch } = useDishes();
  const { addToCart, toggleFavorite, favorites } = useStore();
  const toast = useToast();
  const { cart: navCart, user: navUser } = useNavbarState();

  const liveDish = getDishBySlug(dishId);

  // Only the fields the API actually returns are overridden — the heat/
  // injera/side-accent options, heritage note, and pairings below are
  // curated content the backend doesn't provide, so they stay as-is
  // regardless of which dish this is.
  const orderContent = liveDish
    ? {
        ...order,
        name: liveDish.nameEn,
        note: liveDish.nameAm ? `(${liveDish.nameAm})` : order.note,
        price: String(liveDish.priceETB),
        description: liveDish.description,
      }
    : order;

  const [values, setValues] = useState(order.defaults);
  const [quantity, setQuantity] = useState(1);
  const stillLooking = (menuLoading || specialsLoading) && !liveDish;

  // A dish detail page always has a real dish id: the live slug when the API
  // resolved one, otherwise the URL param the demo content is keyed to.
  const currentDishId = liveDish?.slug ?? dishId;
  const isFavorite = favorites.some((item) => item.id === currentDishId);

  const handleGroupChange = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));

  // Turns { heat: "traditional", sides: ["ayib"] } into readable titles like
  // { heat: "Traditional", sides: ["Fresh Ayib"] }, and adds up any "+ETB NN"
  // deltas on the selected options so the cart price reflects real choices.
  const { selectionTitles, optionDelta } = order.groups.reduce(
    (acc, group) => {
      const selected = values[group.key];
      const chosen = Array.isArray(selected) ? selected : [selected];
      const titles = [];
      for (const value of chosen) {
        const option = group.options.find((o) => o.value === value);
        if (!option) continue;
        titles.push(option.title);
        acc.optionDelta += priceDelta(option.note);
      }
      acc.selectionTitles[group.key] = Array.isArray(selected) ? titles : titles[0];
      return acc;
    },
    { selectionTitles: {}, optionDelta: 0 }
  );

  const unitPrice = Number(orderContent.price) + optionDelta;
  const dishForCart = {
    id: currentDishId,
    name: orderContent.name,
    note: orderContent.note,
    price: unitPrice,
    description: orderContent.description,
    image: gallery.images[0],
  };

  const handleAddToOrder = () => {
    addToCart(dishForCart, quantity, selectionTitles);
    toast(`Added ${quantity} × ${orderContent.name} to your basket`);
  };

  const handleSaveFavorite = () => {
    toggleFavorite({ id: currentDishId, name: orderContent.name });
    toast(isFavorite ? "Removed from favorites" : "Saved to favorites");
  };

  const handleOrderAsGroup = () => {
    addToCart(dishForCart, quantity, { ...selectionTitles, presentation: "Group Mesob Feast" });
    toast("Added as a group feast — check your basket");
    navigate("/cart");
  };

  const handleAddPairing = (item) => {
    addToCart(item);
    toast(`Added ${item.name} to your basket`);
  };

  return (
    <>
      <Navbar links={navLinks} cart={navCart} user={navUser} />

      <main className="container">
        <Breadcrumbs items={dishBreadcrumbs} />

        {(menuError || specialsError) && !liveDish && (
          <AsyncNotice
            variant="error"
            message="Couldn't load live dish data — showing example details instead."
            onRetry={refetch}
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
              <PairingCard key={item.name} item={item} onAdd={handleAddPairing} />
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
          <Button as={Link} to={closingBand.action.to} variant="outline" rightIcon={<FiArrowRight />}>
            {closingBand.action.label}
          </Button>
        </div>
      </main>

      <Footer {...footer} />
    </>
  );
}
