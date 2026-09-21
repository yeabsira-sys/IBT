import {
  FaBox,
  FaCircleCheck,
  FaLock,
  FaMugHot,
  FaTruckFast,
} from "react-icons/fa6";

const photo = (id, w = 300) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

export const basketBreadcrumbs = [
  { label: "Home", to: "/" },
  { label: "Menu", to: "/menu" },
  { label: "Your Gursha Basket" },
];

export const deliveryBanner = {
  message: "Complimentary delivery across Bole, Kazanchis, and Sarbet on orders over ETB 1,200.",
  note: "Threshold unlocked",
};

export const checkoutSteps = ["Review Basket", "Delivery Details", "Confirmation"];

export const basketGroup = {
  heading: "Clay Pot Stews & Provisions",
  count: "3 handcrafted selections",
};

export const initialItems = [
  {
    id: "royal-doro-wat",
    name: "Royal Doro Wat",
    note: "(ያዶሮ ወጥ)",
    price: "710",
    quantity: 1,
    description:
      "Slow-simmered highland rooster, whole spiced boiled egg, 100% pure teff injera rolls, ayib cheese crumb & berbere jus.",
    image: photo("1580651315530-69c8e0026377"),
    tags: [
      { text: "Heritage Feast", tone: "brand" },
      { text: "Berbere Grade 3", tone: "gold" },
    ],
  },
  {
    id: "siga-derek-tibs",
    name: "Siga Derek Tibs",
    note: "(ስጋ ደረቅ ጥብስ)",
    price: "620",
    quantity: 1,
    description:
      "Flash-charred prime pasture beef, garden rosemary sprigs, seared jalapeño rounds, served with house awaze mustard emulsion.",
    image: photo("1604909052743-94e838986d24"),
    tags: [
      { text: "Skillet Sizzle", tone: "gold" },
      { text: "Well Done + Awaze", tone: "dark" },
    ],
  },
  {
    id: "house-brewed-tej",
    name: "House Brewed Tej",
    note: "(500ml)",
    price: "350",
    quantity: 1,
    description:
      "Fermented Tigray floral honey, gesho leaf bittering, poured chilled in an authentic berele glass decanter.",
    image: photo("1514362545857-3bc16c4c7d1b"),
    tags: [
      { text: "House Cellar", tone: "gold" },
      { text: "Natural Wild Ferment", tone: "green" },
    ],
  },
];

export const etiquette = {
  heading: "Gursha Hospitality & Dining Etiquette",
  cards: [
    {
      title: "Include Traditional Handwash Basin",
      text: "Scented warm lemon towels and hand-rinsing urn presentation.",
    },
    {
      title: "No Cutlery Needed (True Gursha)",
      text: "We embrace the communal joy of eating with fresh injera rolls.",
    },
  ],
  noteLabel: "Kitchen Chef Note / Injera Separation Preference",
  notePlaceholder:
    "E.g., Please wrap extra teff rolls in heat-retaining gold foil separately from the Doro Wat pot…",
  meaning: {
    title: "The Meaning of Gursha (ጉርሻ)",
    text: "In Habesha dining culture, placing a savory morsel directly into a companion's mouth with love cements trust, friendship and shared celebration. Every platter at Mesob House is prepared to be shared this way.",
  },
};

export const ledger = {
  title: "Basket Ledger",
  rows: [
    { label: "Items Subtotal (3 items)", value: "ETB 1,680" },
    { label: "100% Teff Injera Upgrade", value: "ETB 60" },
    { label: "Insulated Traditional Clay-Pak", value: "ETB 40" },
    { label: "Delivery Fee (Bole Zone)", value: "Free", tone: "positive" },
    { label: "City VAT & Tourism Levy (15%)", value: "ETB 258" },
  ],
  coupon: { label: "GURSHA2025 applied", value: "− ETB 200" },
  couponPlaceholder: "Have another coupon code?",
  total: "1,838",
  ctaLabel: "Proceed to Delivery Checkout",
  ctaTo: "/checkout",
  exploreLabel: "Explore more dishes from our Menu",
  exploreTo: "/menu",
  trust: [
    { icon: <FaBox />, text: "Piping warm delivery in woven mesob packaging" },
    { icon: <FaTruckFast />, text: "Telebirr, CBE Birr, cash & card on delivery" },
    { icon: <FaLock />, text: "Encrypted checkout & real-time dispatcher SMS" },
  ],
  upsell: {
    icon: <FaMugHot />,
    title: "Adding Fresh Jebena Buna?",
    text: "Complement your feast with our 4:00 PM ritual roasted coffee beans with frankincense aroma.",
    action: "Add to order",
  },
};

export const currency = "ETB";
export { FaCircleCheck };
