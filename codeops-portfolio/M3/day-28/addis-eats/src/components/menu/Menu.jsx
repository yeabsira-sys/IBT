import { useState } from "react";
import { dishes } from "../../data";
import CategoryBar from "../category-bar/CategoryBars";
import DishList from "../dish-list/DishList";
import OrderForm from "../order-form/OrderForm";
import "./menu.css";

const Menu = ({ searchKey = "" }) => {
  const [category, setCategory] = useState("All");
  const [orderTotal, setOrderTotal] = useState(0);

  const filteredDishes = dishes.filter((dish) => {
    const matchesCategory = category === "All" || dish.category === category;

    const matchesSearch =
      !searchKey ||
      searchKey.toLowerCase() === "all" ||
      dish.category.toLowerCase().includes(searchKey.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const handleAdd = (price) => {
    setOrderTotal((previousTotal) => previousTotal + price);
  };

  return (
    <section className="menu-container">
      <h2>Our Menu</h2>

      <CategoryBar selected={category} onSelect={setCategory} />

      <div className="order-total">
        <strong>Order Total:</strong> {orderTotal} ETB
      </div>

      <DishList dishes={filteredDishes} onAdd={handleAdd} />

      <OrderForm />
    </section>
  );
};

export default Menu;
