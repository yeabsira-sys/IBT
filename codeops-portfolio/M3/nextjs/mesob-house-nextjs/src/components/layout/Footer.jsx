"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaFacebookF, FaInstagram, FaTelegram } from "react-icons/fa6";
import { FaMugHot } from "react-icons/fa6";
import useSession from "@/hooks/useSession";

/** FooterColumn — heading + list of internal links or plain lines. */
export function FooterColumn({ heading, items = [] }) {
  return (
    <div>
      <h4 className="footer__heading">{heading}</h4>
      <ul className="footer__list">
        {items.map((item, i) => (
          <li key={i} className={item.accent ? "footer__accent" : undefined}>
            {item.href ? <Link href={item.href}>{item.label}</Link> : item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Footer — brand blurb, three link columns and the legal bar.
 */
export default function Footer({
  brand,
  blurb,
  note,
  columns = [],
  location,
  legal,
  legalLinks = [],
  socials = [
    { label: "Facebook", href: "#", icon: <FaFacebookF /> },
    { label: "Instagram", href: "#", icon: <FaInstagram /> },
    { label: "Telegram", href: "#", icon: <FaTelegram /> },
  ],
}) {
  const pathname = usePathname();
  const { user } = useSession();
  const staffArea = pathname.startsWith("/admin") || pathname.startsWith("/kitchen");
  const isStaff = user?.role === "employee" || user?.role === "admin" || staffArea;

  // Staff get the legal bar only: no marketing columns, hours or location.
  // Legal links point at public shop pages, which are blocked for staff.
  if (isStaff) {
    return (
      <footer className="footer footer--minimal">
        <div className="container">
          <div className="footer__bar">
            <span>{legal}</span>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div>
            <h3 className="footer__brand-name">{brand}</h3>
            <p className="footer__brand-text">{blurb}</p>
            {note && (
              <div className="footer__note">
                <FaMugHot aria-hidden="true" />
                <span>{note}</span>
              </div>
            )}
          </div>

          {columns.map((column) => (
            <FooterColumn key={column.heading} {...column} />
          ))}

          {location && (
            <div>
              <h4 className="footer__heading">{location.heading}</h4>
              <p className="footer__brand-text">{location.address}</p>
              <p className="footer__phone" style={{ marginTop: 10 }}>
                {location.phone}
              </p>
              <div className="footer__socials">
                {socials.map((social) => (
                  <a key={social.label} href={social.href} aria-label={social.label}>
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="footer__bar">
          <span>{legal}</span>
          <span className="footer__bar-links">
            {legalLinks.map((link) => (
              <Link key={link.label} href={link.href}>
                {link.label}
              </Link>
            ))}
          </span>
        </div>
      </div>
    </footer>
  );
}
