"use client";

import { useState } from "react";
import { useMenuSearch } from "@/hooks/useMenuSearch";

export default function MenuClient() {
  const [search, setSearch] = useState("");

  const {
    data: dishes = [],
    error,
    isLoading,
    isValidating,
  } = useMenuSearch(search);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Addis Eats Menu</h1>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search dishes..."
        aria-label="Search dishes"
        className="mb-4 w-full rounded-lg border p-3"
      />

      {isLoading && <p>Loading menu...</p>}

      {isValidating && !isLoading && (
        <p className="mb-3 text-sm text-gray-500">Refreshing menu...</p>
      )}

      {error && (
        <p className="text-red-600">Failed to load menu: {error.message}</p>
      )}

      {!isLoading && !error && dishes.length === 0 && <p>No dishes found.</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dishes.map((dish) => (
          <article key={dish.id} className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">{dish.name}</h2>

            {dish.description && (
              <p className="mt-2 text-gray-600">{dish.description}</p>
            )}

            {dish.price != null && (
              <p className="mt-3 font-bold">{dish.price} ETB</p>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
