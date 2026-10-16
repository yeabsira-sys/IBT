"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "../context/CartProvider";

export default function Navbar() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const links = [
    { href: "/", label: "Home" },
    { href: "/menu", label: "Menu" },
  ];

  return (
    <header className="site-header">
      <div className="container navbar">
        <Link href="/" className="brand" aria-label="Mesob House home">
          <span className="brand-mark" aria-hidden="true">M</span>
          <span>Mesob House</span>
        </Link>
        <nav className="nav-links" aria-label="Main navigation">
          {links.map((link) => (
            <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined}>
              {link.label}
            </Link>
          ))}
          <Link className="cart-link" href="/cart" aria-current={pathname === "/cart" ? "page" : undefined}>
            Cart <span className="cart-count">{itemCount}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
