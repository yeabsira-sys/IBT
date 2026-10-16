"use client";

import Link from "next/link";
import useSWR from "swr";
import Image from "next/image";
import { notFound } from "next/navigation";
import DishDetailActions from "./DishDetailActions";
import { fetcher } from "../lib/fetcher";

const MENU_API = "https://addis-eats-backend.onrender.com/menu";

export default function DishPageContent({ slug }) {
  const { data, error, isLoading } = useSWR(MENU_API, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 2000,
  });

  const dishes = Array.isArray(data) ? data : (data?.data ?? []);

  if (isLoading) {
    return (
      <main className="section">
        <div className="container">
          <p>Loading dish details...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="section">
        <div className="container">
          <h1>Unable to load dish</h1>
          <p>Please try again later.</p>
        </div>
      </main>
    );
  }

  const dish = dishes.find((item) => String(item.slug) === slug);

  if (!dish) {
    notFound();
  }

  return (
    <main className="section">
      <div className="container">
        <p style={{ marginBottom: 24, color: "var(--c-ink-muted)" }}>
          <Link href="/">Home</Link> / <Link href="/menu">Menu</Link> /{" "}
          {dish.nameEn}
        </p>

        <div className="dish-detail">
          {dish.image && (
            <div className="dish-detail-image-wrapper">
              <Image
                className="dish-detail-image"
                src={dish.image}
                alt={dish.nameEn}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            </div>
          )}

          <div className="dish-detail-copy">
            <span className="eyebrow">{dish.category}</span>

            <h1>{dish.nameEn}</h1>

            {dish.nameAm && <p lang="am">{dish.nameAm}</p>}

            <p>{dish.description}</p>

            <div className="price">
              {Number(dish.priceETB).toLocaleString()} ETB
            </div>

            {dish.spiceLevel && (
              <p>
                <strong>Spice level:</strong> {dish.spiceLevel}
              </p>
            )}

            {dish.servings && (
              <p>
                <strong>Serving:</strong> {dish.servings}
              </p>
            )}

            {dish.ingredients?.length > 0 && (
              <>
                <h3>Ingredients</h3>
                <ul>
                  {dish.ingredients.map((ingredient) => (
                    <li key={ingredient}>{ingredient}</li>
                  ))}
                </ul>
              </>
            )}

            <DishDetailActions
              dish={{
                ...dish,
                name: dish.nameEn,
                price: dish.priceETB,
              }}
            />

            <p className="muted" style={{ fontSize: ".88rem" }}>
              Freshly prepared. Prices are shown in Ethiopian birr.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
