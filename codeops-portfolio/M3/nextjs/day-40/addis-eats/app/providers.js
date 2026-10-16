"use client";

import { CartProvider } from "../context/CartProvider";

export default function Providers({ children }) {
  return <CartProvider>{children}</CartProvider>;
}
