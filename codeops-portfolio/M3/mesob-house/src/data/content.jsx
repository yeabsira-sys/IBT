import {
  FaBellConcierge,
  FaCalendarCheck,
  FaHandHoldingHeart,
  FaTruckFast,
  FaWineGlass,
} from "react-icons/fa6";

export const navLinks = [
  { label: "Menu", href: "/menu" },
  { label: "Featured Dish", href: "/dish/royal-doro-wat" },
  { label: "Order & Cart", href: "/cart" },
  { label: "Delivery & Checkout", href: "/checkout" },
];

export const cart = { itemCount: 3, currency: "ETB", amount: "1,450" };

export const breadcrumbs = [
  { label: "Home", to: "/" },
  { label: "Account", to: "/account" },
  { label: "Join the Mesob Family" },
];

export const benefits = [
  {
    icon: <FaWineGlass />,
    title: "Welcome Gift: Pure Tej or Buna",
    description:
      "Enjoy a complimentary flask of house-fermented tej (pure honey wine) or a personalized Jebena buna coffee ceremony with your inaugural banquet booking.",
  },
  {
    icon: <FaHandHoldingHeart />,
    title: "Communal Gursha Points",
    description:
      "Earn generous loyalty points redeemable for hand-poured pure teff injera, prime siga tibs and bespoke banquet upgrades.",
  },
  {
    icon: <FaCalendarCheck />,
    title: "Fasting Calendar Alerts",
    description:
      "Timely seasonal notifications for Tsom fasting periods, chef's Beyaynetu spreads and lenten specialties.",
  },
  {
    icon: <FaTruckFast />,
    title: "Express Addis Delivery",
    description:
      "Save Bole, Kazanchis, Old Airport or Sarbet drop-offs for fast clay-pot temperature delivery straight to your doorstep.",
  },
  {
    icon: <FaBellConcierge />,
    title: "Priority Table Reservations",
    description:
      "Skip standard waitlists for weekend live Kirar acoustic sets and evening green-coffee roasting ceremonies.",
  },
];

export const testimonial = {
  image:
    "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=200&q=60",
  imageAlt: "Shared platter of injera and stews",
  eyebrow: "Tradition in Every Bite",
  quote: "Sharing from the same mesob is the ancient covenant of love and trust.",
  source: "Habesha proverb",
};

export const dietaryOptions = [
  { value: "all-heritage", label: "All Heritage Delicacies" },
  { value: "fasting-vegan", label: "Fasting & Vegan (Tsom)" },
  { value: "halal", label: "Halal Certified Meat" },
  { value: "teff", label: "100% Pure Teff (Gluten-Free)" },
];

export const footer = {
  brand: "Mesob House",
  blurb: "Sharing traditions from the Ethiopian highlands — one gursha at a time.",
  note: "Traditional coffee ceremony daily at 4:00 PM",
  columns: [
    {
      heading: "Hospitality Hours",
      items: [
        { label: "Tuesday – Sunday: 11:30 AM – 11:00 PM" },
        { label: "Monday: Reserved for Private Banquets" },
        { label: "Jebena Buna & Fresh Roasting All Evening", accent: true },
      ],
    },
    {
      heading: "Guest Account & Traditions",
      items: [
        { label: "Sign In to Mesob Rewards", href: "/sign-in" },
        { label: "Create Member Profile", href: "/register" },
        { label: "Vegan Fasting (Beyaynetu / Tsom)", href: "/fasting" },
        { label: "House Tej (Pure Honey Wine)", href: "/tej" },
      ],
    },
  ],
  location: {
    heading: "Addis Location",
    address: "Bole Medhanialem, Addis Ababa & express delivery across town.",
    phone: "+251 911 234 567",
  },
  legal:
    "© 2026 Mesob House · Habesha dining. Authentic Ethiopian & Eritrean heritage.",
  legalLinks: [
    { label: "Gursha Hospitality", href: "/hospitality" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Table", href: "/terms" },
  ],
};
