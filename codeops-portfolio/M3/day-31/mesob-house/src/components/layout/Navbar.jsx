import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { FiMenu, FiShoppingBag, FiX } from "react-icons/fi";
import Button from "../ui/Button";
import { Avatar } from "../ui/Primitives";

export function CartPill({
  itemCount = 0,
  currency = "ETB",
  amount = "0",
  to = "/cart",
}) {
  return (
    <Link className="cart-pill" to={to}>
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

/** UserChip — signed-in guest greeting, exported for reuse. */
export function UserChip({
  name,
  greeting = "Welcome",
  avatar,
  to = "/account",
}) {
  return (
    <Link className="user-chip" to={to}>
      <Avatar name={name} src={avatar} size={30} />
      <span className="user-chip__text">
        <span className="user-chip__greeting">{greeting}</span>
        <span className="user-chip__name">Selam, {name.split(" ")[0]}</span>
      </span>
    </Link>
  );
}

export default function Navbar({
  brand = "Mesob House",
  links = [],
  cart,
  user,
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Lock page scroll while the mobile menu is open, and let Escape close it.
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link className="navbar__brand" to="/" onClick={close}>
          {brand}
        </Link>

        <nav className="navbar__links" aria-label="Primary">
          {links.map((link) => (
            <NavLink
              key={link.href}
              to={link.href}
              className={({ isActive }) =>
                `navbar__link${isActive ? " navbar__link--active" : ""}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="navbar__right">
          <div className="navbar__actions">
            <CartPill {...cart} />
            {user ? (
              <UserChip {...user} />
            ) : (
              <>
                <Button as={Link} to="/sign-in" variant="ghost" size="sm">
                  Sign In
                </Button>
                <Button as={Link} to="/register" variant="outline" size="sm">
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
          <button
            className="navbar__backdrop"
            aria-hidden="true"
            tabIndex={-1}
            onClick={close}
          />
          <nav
            className="navbar__mobile"
            id="navbar-mobile-menu"
            aria-label="Primary"
          >
            {links.map((link) => (
              <NavLink
                key={link.href}
                to={link.href}
                onClick={close}
                className={({ isActive }) =>
                  isActive ? "navbar__mobile-link--active" : undefined
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </>
      )}
    </header>
  );
}
