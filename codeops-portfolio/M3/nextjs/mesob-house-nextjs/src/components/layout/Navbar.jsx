"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiMenu, FiShoppingBag, FiX } from "react-icons/fi";
import Button from "../ui/Button";
import { Avatar } from "../ui/Primitives";
import useNavbarState from "@/hooks/useNavbarState";

/** CartPill — item count + running total, exported for reuse in other headers. */
export function CartPill({ itemCount = 0, currency = "ETB", amount = "0", href = "/cart" }) {
  return (
    <Link className="cart-pill" href={href}>
      <span className="cart-pill__badge">
        <FiShoppingBag aria-hidden="true" />
        {itemCount} items
      </span>
      <span className="cart-pill__meta">
        <span className="cart-pill__currency">{currency}</span>
        <span className="cart-pill__amount">{amount}</span>
      </span>
    </Link>
  );
}

/** UserChip — signed-in guest greeting. Links to the account page. */
export function UserChip({ name, greeting = "Welcome", avatar, href = "/account" }) {
  return (
    <Link className="user-chip" href={href}>
      <Avatar name={name} src={avatar} size={30} />
      <span className="user-chip__text">
        <span className="user-chip__greeting">{greeting}</span>
        <span className="user-chip__name">Selam, {name.split(" ")[0]}</span>
      </span>
    </Link>
  );
}

const isActive = (pathname, link) =>
  link.match ? pathname.startsWith(link.match) : pathname === link.href || pathname.startsWith(`${link.href}/`);

/**
 * Navbar — a Client Component (it reads the cart/session store and the
 * current pathname) rendered once from the root layout, so it persists across
 * navigations instead of remounting on every page.
 */
export default function Navbar({ brand = "Mesob House", links = [] }) {
  const pathname = usePathname();
  const { cart, user } = useNavbarState();
  const [open, setOpen] = useState(false);

  // Portal links are only rendered for the roles that can use them. The
  // server still checks the role on every page and action.
  const portalLinks = [];
  if (user) portalLinks.push({ label: "Orders", href: "/orders" });
  const staffArea = pathname.startsWith("/admin") || pathname.startsWith("/kitchen");
  const isStaffRole = user?.role === "employee" || user?.role === "admin";
  const isStaff = isStaffRole || staffArea;
  if (isStaffRole) portalLinks.push({ label: "Kitchen", href: "/kitchen" });
  if (user?.role === "admin") portalLinks.push({ label: "Admin", href: "/admin" });

  // Staff work from the portal. Hide the public ordering links and the cart
  // pill so the header stays focused on the queue/admin surfaces.
  const visibleLinks = isStaff ? portalLinks : [...links, ...portalLinks];

  // Close the mobile menu whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  // Lock page scroll while the mobile menu is open, and let Escape close it.
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link className="navbar__brand" href="/">
          {brand}
        </Link>

        <nav className="navbar__links" aria-label="Primary">
          {visibleLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`navbar__link${isActive(pathname, link) ? " navbar__link--active" : ""}`}
              aria-current={isActive(pathname, link) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="navbar__right">
          <div className="navbar__actions">
            {!isStaff && <CartPill {...cart} />}
            {user ? (
              <UserChip {...user} />
            ) : (
              <>
                <Button as={Link} href="/sign-in" variant="ghost" size="sm">
                  Sign In
                </Button>
                <Button as={Link} href="/register" variant="outline" size="sm">
                  Register
                </Button>
              </>
            )}
          </div>

          <button
            type="button"
            className="navbar__toggle"
            aria-expanded={open}
            aria-controls="navbar-mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </div>

      {open && (
        <>
          <button className="navbar__backdrop" aria-hidden="true" tabIndex={-1} onClick={() => setOpen(false)} />
          <nav className="navbar__mobile" id="navbar-mobile-menu" aria-label="Primary">
            {visibleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={isActive(pathname, link) ? "navbar__mobile-link--active" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </>
      )}
    </header>
  );
}
