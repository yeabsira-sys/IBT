import { Inter, Source_Serif_4 } from "next/font/google";

import Navbar from "@/components/layout/Navbar";
import StoreHydrator from "@/components/StoreHydrator";
import ToastViewport from "@/components/ToastViewport";
import { navLinks } from "@/data/content";
import { SITE_URL } from "@/lib/api";

import "@/styles/theme.css";
import "@/styles/components.css";
import "@/styles/home.css";
import "@/styles/menu.css";
import "@/styles/dish.css";
import "@/styles/basket.css";
import "@/styles/auth.css";
import "@/styles/checkout.css";
import "@/styles/notfound.css";
import "@/styles/account.css";
import "@/styles/portal.css";
import "@/styles/app.css";

// next/font self-hosts these at build time: no layout shift, no request to Google from the browser.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Mesob House — Authentic Habesha Dining in Addis Ababa",
    template: "%s | Mesob House",
  },
  description:
    "Slow-cooked Ethiopian wats, stone-ground teff injera and a daily coffee ceremony — order for delivery across Addis Ababa or reserve a communal mesob.",
  applicationName: "Mesob House",
  keywords: [
    "Ethiopian restaurant",
    "Addis Ababa",
    "doro wat",
    "injera",
    "Habesha food delivery",
  ],
  openGraph: { type: "website", siteName: "Mesob House", locale: "en_ET" },
  twitter: { card: "summary_large_image" },
};

export const viewport = {
  themeColor: "#8c2116",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <StoreHydrator />
        <Navbar links={navLinks} />
        {children}
        <ToastViewport />
      </body>
    </html>
  );
}
