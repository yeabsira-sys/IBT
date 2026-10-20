"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Gallery from "./Gallery";
import OrderPanel from "./OrderPanel";
import useAddToCart from "@/hooks/useAddToCart";
import { useStore } from "@/store/appStore";
import { useToast } from "@/store/toastStore";

/** Reads a "+ETB 40" style note and returns the numeric add-on, or 0. */
function priceDelta(note) {
  const match = /\+ETB\s?(\d+)/.exec(note ?? "");
  return match ? Number(match[1]) : 0;
}

/**
 * DishOrder — the interactive half of the dish page: gallery, option groups,
 * quantity, add-to-order, favorites. The server page fetches the dish and
 * passes it in as plain props; only this island ships its JavaScript.
 */
export default function DishOrder({ dish, config, galleryProps }) {
  const router = useRouter();
  const toast = useToast();
  const addToCart = useAddToCart();
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const isFavorite = useStore((s) => s.favorites.some((f) => f.id === dish.id));

  const [values, setValues] = useState(config.defaults);
  const [quantity, setQuantity] = useState(1);

  // Readable titles of the chosen options + the sum of any "+ETB NN" add-ons.
  const { selectionTitles, optionDelta } = config.groups.reduce(
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
    { selectionTitles: {}, optionDelta: 0 },
  );

  const unitPrice = Number(dish.price) + optionDelta;
  const dishForCart = {
    id: dish.id,
    name: dish.name,
    note: dish.nativeName ? `(${dish.nativeName})` : "",
    price: unitPrice,
    description: dish.description,
    image: dish.image,
  };

  return (
    <div className="dish-detail">
      <Gallery {...galleryProps} />

      <OrderPanel
        name={dish.name}
        note={dishForCart.note}
        price={String(dish.price)}
        description={dish.description}
        info={config.info}
        groups={config.groups}
        values={values}
        onGroupChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
        quantity={quantity}
        onQuantityChange={setQuantity}
        onAddToOrder={() => addToCart(dishForCart, quantity, selectionTitles)}
        onSaveFavorite={() => {
          toggleFavorite({ id: dish.id, name: dish.name });
          toast(isFavorite ? "Removed from favorites" : "Saved to favorites");
        }}
        isFavorite={isFavorite}
        onOrderAsGroup={() => {
          addToCart(dishForCart, quantity, { ...selectionTitles, presentation: "Group Mesob Feast" });
          router.push("/cart");
        }}
      />
    </div>
  );
}
