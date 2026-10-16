"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "mesob-house-cart";

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  function addToCart(dish, quantity = 1) {
    setItems((current) => {
      const found = current.find((item) => String(item.id) === String(dish.id));
      if (found) return current.map((item) =>
        String(item.id) === String(dish.id) ? { ...item, quantity: item.quantity + quantity } : item
      );
      return [...current, { ...dish, quantity }];
    });
  }

  function updateQuantity(id, quantity) {
    setItems((current) => quantity <= 0
      ? current.filter((item) => String(item.id) !== String(id))
      : current.map((item) => String(item.id) === String(id) ? { ...item, quantity } : item)
    );
  }

  function removeFromCart(id) {
    setItems((current) => current.filter((item) => String(item.id) !== String(id)));
  }

  function clearCart() { setItems([]); }

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0);
  const value = useMemo(() => ({
    items, itemCount, total, ready, addToCart, updateQuantity, removeFromCart, clearCart,
  }), [items, itemCount, total, ready]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
