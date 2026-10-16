"use client";

import { useMemo, useState } from "react";
import DishCard from "../../components/DishCard";
import { dishes } from "./dishes";

export default function MenuPage() {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const categories = ["All", ...new Set(dishes.map((dish) => dish.category))];
  const filtered = useMemo(() => dishes.filter((dish) =>
    (category === "All" || dish.category === category) &&
    `${dish.name} ${dish.description}`.toLowerCase().includes(query.toLowerCase())
  ), [category, query]);

  return (
    <main>
      <div className="container page-heading">
        <span className="eyebrow">Made fresh for you</span><h1>Our menu</h1>
        <p>Traditional favorites and comforting flavors, ready for your table.</p>
      </div>
      <section className="container" style={{ paddingBottom: 40 }}>
        <div className="menu-tools">
          <div><strong>{filtered.length}</strong> delicious options</div>
          <input className="search-field" type="search" placeholder="Search dishes…" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search menu" />
        </div>
        <div className="category-bar" aria-label="Filter menu by category">
          {categories.map((item) => <button key={item} className={`category-chip ${category === item ? "active" : ""}`} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
        {filtered.length ? <div className="dish-grid">{filtered.map((dish) => <DishCard key={dish.id} dish={dish} />)}</div> :
          <div className="empty-state"><h2>No dishes found</h2><p>Try another search or category.</p><button className="btn btn-secondary" onClick={() => { setQuery(""); setCategory("All"); }}>Clear filters</button></div>}
      </section>
    </main>
  );
}
