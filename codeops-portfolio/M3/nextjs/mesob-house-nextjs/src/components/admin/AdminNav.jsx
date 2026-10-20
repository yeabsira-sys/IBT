import Link from "next/link";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/users", label: "Users" },
  { href: "/kitchen", label: "Kitchen" },
];

/** Shared admin sub-navigation. The pages still verify the admin role. */
export default function AdminNav() {
  return (
    <nav className="portal-subnav" aria-label="Admin">
      {links.map((link) => (
        <Link key={link.href} href={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
