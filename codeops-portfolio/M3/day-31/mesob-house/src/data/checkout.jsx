import {
  FaBowlFood,
  FaBuildingColumns,
  FaHeadset,
  FaKitchenSet,
  FaLocationCrosshairs,
  FaQrcode,
  FaRoute,
  FaShieldHeart,
  FaStore,
  FaTruckFast,
} from "react-icons/fa6";

const photo = (id, w = 200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

export const checkoutBreadcrumbSteps = ["Review Order", "Delivery & Payment", "Confirmation"];

export const fulfillmentOptions = [
  { value: "delivery", label: "Prompt Delivery across Addis", icon: <FaTruckFast /> },
  { value: "pickup", label: "Dine-in Pickup (Bole)", icon: <FaStore /> },
];

export const contact = {
  badge: "Habesha Hospitality",
  values: {
    name: "Abebe Bekele",
    phone: "911 45 7890",
    email: "abebe.b@example.com",
  },
};

export const delivery = {
  badge: { icon: <FaKitchenSet />, label: "Insulated Mesob Carrier" },
  subCities: [
    "Bole Medhanialem (Near Mesob House)",
    "Kazanchis",
    "Sarbet",
    "Old Airport",
    "CMC",
  ],
  values: {
    subCity: "Bole Medhanialem (Near Mesob House)",
    street: "Behind Edna Mall, House No. 402, 3rd Floor",
    landmark: "Opposite to Boston Day Spa, entrance through dark green gate",
    timing: "immediate",
  },
  timingOptions: [
    {
      value: "immediate",
      title: "Immediate Dispatch",
      description: "Fresh & hot off clay stove (~35–45 min)",
    },
    {
      value: "scheduled",
      title: "Schedule for Dinner",
      description: "Set for evening feast (e.g., 7:30 PM)",
    },
  ],
  route: {
    icon: <FaRoute />,
    title: "Direct Kitchen-to-Door Route",
    text: "Dispatched with heated earthen tray covers.",
    badge: "Bole Zone Priority",
  },
};

export const payment = {
  telebirr: {
    name: "Telebirr",
    badge: "Popular",
    text: "Instant SuperApp QR prompt or USSD confirmation",
    tint: "#8a6116",
    mark: "tb",
    icon: <FaQrcode />,
    qrIcon: <FaQrcode size={44} />,
    panelTitle: "Telebirr Quick Merchant Pay",
    panelText: "Merchant ID: MESOB-7781. Enter your Telebirr-registered phone to authorize instant debit.",
  },
  otherMethods: [
    {
      name: "CBE Birr / CBE Mobile Banking",
      text: "Direct settlement via Commercial Bank of Ethiopia",
      tint: "#1f5d45",
      mark: "CBE",
      icon: <FaBuildingColumns />,
    },
    {
      name: "Cash or Card on Delivery",
      text: "Rider delivers with wireless POS card terminal + change for cash",
      tint: "#9d2b12",
      mark: "POS",
      icon: <FaBowlFood />,
    },
    {
      name: "Amole / Awash Birr",
      text: "Dashen Amole wallet or Awash Birr direct integration",
      tint: "#c7b299",
      mark: "AB",
      icon: <FaLocationCrosshairs />,
    },
  ],
};

export const promise = {
  icon: <FaShieldHeart />,
  title: "The Mesob House Promise",
  text: "Each communal platter arrives with four extra folds of authentic 100% pure teff injera, warm wet towels, and our hand-blended Mitmita spice on the side.",
};

export const summary = {
  eyebrow: "Habesha Feast",
  title: "Order Summary",
  editHref: "/cart",
  items: [
    {
      name: "Royal Doro Wat",
      price: "710",
      quantity: 1,
      description: "Free-range chicken, spiced butter (Niter Qibe), boiled organic egg.",
      image: photo("1580651315530-69c8e0026377"),
      tag: { text: "Spicy Berbere", tone: "brand" },
    },
    {
      name: "Siga Derek Tibs",
      price: "620",
      quantity: 1,
      description: "Crispy pan-fried prime beef, rosemary, fresh green chilies.",
      image: photo("1604909052743-94e838986d24"),
      tag: { text: "Chef Signature", tone: "gold" },
    },
    {
      name: "House Tej Honey Wine",
      price: "350",
      quantity: 1,
      description: "Artisanal fermented wild highland honey & Gesho herbs (500ml).",
      image: photo("1514362545857-3bc16c4c7d1b"),
      tag: { text: "Berele Flask", tone: "green" },
    },
  ],
  deliveringTo: {
    status: "Active Corridor",
    address: "Bole Sub-city, Edna Mall area",
    eta: "Estimated arrival ~35–45 mins from clay oven sealing",
  },
  costs: [
    { label: "Items Subtotal", value: "ETB 1,680" },
    { label: "Express Delivery (Bole Radius)", value: "ETB 158" },
    { label: "Complimentary Injera (4 Rolls)", value: "Included", tone: "positive" },
    { label: "Clay Stew Thermal Packaging", value: "Free", tone: "positive" },
  ],
  total: "1,838",
  guarantee: "Guaranteed steaming hot in woven sealed carriers or 100% remade.",
  ctaLabel: "Confirm Order & Pay ETB 1,838",
  support: {
    icon: <FaHeadset />,
    title: "Need Phone Support?",
    text: "Direct kitchen desk: +251 911 234 567",
    phone: "+251911234567",
  },
};
