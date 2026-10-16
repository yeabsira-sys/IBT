"use client";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "../context/CartProvider";

export default function DishCard({ dish }) {
  const { addToCart } = useCart();

  const {
    id,
    slug,
    nameEn,
    nameAm,
    category,
    priceETB,
    spiceLevel,
    isFasting,
    isSpecial,
    description,
    servings,
  } = dish;

  function handleAddToCart() {
    // Normalize the API fields for compatibility with the existing cart.
    addToCart({
      ...dish,
      name: nameEn,
      price: priceETB,
    });
  }

  return (
    <article className="dish-card">
      <Link
        href={`/menu/${slug}`}
        className="dish-card-image-link"
        aria-label={`View ${nameEn}`}
      >
        {dish.image ? (
          <Image
            src={dish.image}
            alt={nameEn}
            fill
            sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 33vw"
            className="dish-card-image"
          />
        ) : (
          <div className="dish-card-image-placeholder">
            <span aria-hidden="true">🍽️</span>
          </div>
        )}

        {isSpecial && <span className="dish-card-special">Chef's Special</span>}
      </Link>

      <div className="dish-card-content">
        <div className="dish-card-badges">
          {category && <span className="dish-card-category">{category}</span>}

          {isFasting && <span className="dish-card-fasting">Fasting</span>}
        </div>

        <h3 className="dish-card-title">
          <Link href={`/menu/${slug || id}`}>{nameEn}</Link>
        </h3>

        {nameAm && (
          <p className="dish-card-amharic" lang="am">
            {nameAm}
          </p>
        )}

        {description && <p className="dish-card-description">{description}</p>}

        {spiceLevel && (
          <p className="dish-card-spice">
            <strong>Flavor:</strong> {spiceLevel}
          </p>
        )}

        {servings && (
          <p className="dish-card-servings">
            <strong>Serving:</strong> {servings}
          </p>
        )}

        <div className="dish-card-footer">
          <strong className="dish-card-price">
            {priceETB != null
              ? `${Number(priceETB).toLocaleString()} ETB`
              : "Price unavailable"}
          </strong>

          <button
            type="button"
            className="btn btn-primary dish-card-add-button"
            onClick={handleAddToCart}
            disabled={priceETB == null}
            aria-label={`Add ${nameEn} to cart`}
          >
            + Add to Cart
          </button>
        </div>
      </div>
    </article>
  );
}
