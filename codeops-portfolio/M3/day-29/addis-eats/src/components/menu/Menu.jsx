import { useEffect, useState } from "react";
import CategoryBar from "../category-bar/CategoryBars";
import DishList from "../dish-list/DishList";
import { useCart } from "../../context/CartContext";
import useFetch from "../../hooks/useFetch";
import "./menu.css";

const Menu = ({ searchKey = "" }) => {
  const [category, setCategory] = useState("All");

  const url =
    category === "All" ? "/dishes.json" : `/dishes.json?category=${category}`;

  const { data: dishes, loading, error } = useFetch("/dishes.json");

  const { dispatch } = useCart();

  useEffect(() => {
    document.title = `Addis Eats — ${dishes.length} dishes`;
  }, [dishes]);

  const filteredDishes = dishes.filter((dish) => {
    const matchesCategory = category === "All" || dish.category === category;

    const matchesSearch =
      !searchKey ||
      dish.name.toLowerCase().includes(searchKey.toLowerCase()) ||
      dish.category.toLowerCase().includes(searchKey.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const handleAdd = (dish) => {
    dispatch({
      type: "ADD_ITEM",
      payload: dish,
    });
  };

  if (loading) {
    return <p className="menu-status">Loading the menu...</p>;
  }

  if (error) {
    return <p className="menu-error">{error}</p>;
  }

  return (
    <section className="menu-container">
      <h2>Our Menu</h2>

      <CategoryBar selected={category} onSelect={setCategory} />

      <DishList dishes={filteredDishes} onAdd={handleAdd} />
    </section>
  );
};

export default Menu;
