"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";

import DishCard from "../../components/DishCard";
import { fetcher } from "../../lib/fetcher";
import { useDebounce } from "../../hooks/useDebounce";

const MENU_API = "https://addis-eats-backend.onrender.com/menu";

export default function MenuPage() {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");

  // Debounce the search input by 400ms.
  const debouncedQuery = useDebounce(query, 400).trim().toLowerCase();

  // Fetch the menu using SWR.
  const { data, error, isLoading, isValidating } = useSWR(MENU_API, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 2000,
    keepPreviousData: true,
  });

  // Support either a direct array or an object containing data.
  const dishes = Array.isArray(data) ? data : (data?.data ?? []);

  const categories = [
    "All",
    ...new Set(dishes.map((dish) => dish.category).filter(Boolean)),
  ];

  // Filter cached data locally because the API has no search endpoint.
  const filtered = useMemo(
    () =>
      dishes.filter(
        (dish) =>
          (category === "All" || dish.category === category) &&
          `${dish.name ?? ""} ${dish.description ?? ""}`
            .toLowerCase()
            .includes(debouncedQuery),
      ),
    [dishes, category, debouncedQuery],
  );

  return (
    <main>
      <div className="container page-heading">
        <span className="eyebrow">Made fresh for you</span>
        <h1>Our menu</h1>
        <p>
          Traditional favorites and comforting flavors, ready for your table.
        </p>
      </div>

      <section className="container" style={{ paddingBottom: 40 }}>
        <div className="menu-tools">
          <div>
            <strong>{filtered.length}</strong> delicious options
          </div>

          <input
            className="search-field"
            type="search"
            placeholder="Search dishes…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search menu"
          />
        </div>

        <div className="category-bar" aria-label="Filter menu by category">
          {categories.map((item) => (
            <button
              key={item}
              className={`category-chip ${category === item ? "active" : ""}`}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p>Loading menu...</p>
        ) : error ? (
          <div className="empty-state">
            <h2>Unable to load menu</h2>
            <p>{error.message}</p>
          </div>
        ) : filtered.length ? (
          <>
            {isValidating && <p aria-live="polite">Refreshing menu...</p>}

            <div className="dish-grid">
              {filtered.map((dish) => (
                <DishCard key={dish.id} dish={dish} />
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <h2>No dishes found</h2>
            <p>Try another search or category.</p>

            <button
              className="btn btn-secondary"
              onClick={() => {
                setQuery("");
                setCategory("All");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
