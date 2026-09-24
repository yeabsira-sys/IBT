import { FaBookOpen, FaLeaf, FaBowlFood } from "react-icons/fa6";
import { FaShieldHeart } from "react-icons/fa6";
import { FaClock, FaReceipt } from "react-icons/fa6";

const photo = (id, w = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

export const dishBreadcrumbs = [
  { label: "Home", to: "/" },
  { label: "Menu", to: "/menu" },
  { label: "Traditional Stews & Wat", to: "/menu?category=stews" },
  { label: "Royal Doro Wat" },
];

export const gallery = {
  images: [
    photo("1580651315530-69c8e0026377"),
    photo("1604909052743-94e838986d24", 400),
    photo("1543353071-873f17a7a088", 400),
    photo("1567364816519-cbc9c4ffe1eb", 400),
  ],
  alt: "Royal Doro Wat served in a clay pot with injera",
  badges: [
    { text: "House Signature", tone: "gold" },
    { text: "100% Teff Option", tone: "green" },
  ],
  caption: { left: "Simmered 14 Hours", right: "Mesob Addis Recipe #01" },
};

export const heritage = {
  icon: <FaBookOpen />,
  eyebrow: "Heritage & Lineage · The Crown Jewel",
  title: "Royal Feast of the Highlands",
  text: "Traditionally reserved for festive holidays such as Fasika and Enkutatash, Doro Wat is the ultimate test of culinary mastery. Each pot demands simmering over 3 kilograms of hand-chopped sweet red onions without a single drop of water, patiently reduced for half a day with our hand-milled berbere spice blend and nit'ir qibe (aromatic clarified butter).",
};

export const specs = [
  { label: "Preparation", value: "Slow Stewed" },
  { label: "Origin", value: "Highland Shewa" },
  { label: "Allergens", value: "Poultry, Dairy (Butter)" },
];

export const order = {
  name: "Royal Doro Wat",
  note: "(ያዶሮ ወጥ)",
  price: "650",
  description:
    "Tender slow-braised free-range chicken drumstick and thigh infused with aromatic Ethiopian berbere, nit'ir qibe, and a whole simmered seasoned farm egg.",
  info: [
    { icon: <FaBowlFood />, label: "Serves 1–2", sub: "generously" },
    {
      icon: <FaReceipt />,
      label: "Unlimited table injera refill",
      sub: "included",
    },
    { icon: <FaShieldHeart />, label: "Taxes", sub: "included", tone: "green" },
  ],
  groups: [
    {
      key: "heat",
      step: 1,
      title: "Heat & Spice Level",
      icon: "🌶️",
      badge: "Required",
      columns: 3,
      options: [
        {
          value: "mild",
          title: "Mild",
          description: "Alicha touch, fragrant cardamoms",
          note: "1/3",
        },
        {
          value: "traditional",
          title: "Traditional",
          description: "Berbere warmth (recommended)",
          note: "2/3",
        },
        {
          value: "fiery",
          title: "Fiery Awaze",
          description: "Served with awaze & mitmita dip",
          note: "3/3",
        },
      ],
    },
    {
      key: "injera",
      step: 2,
      title: "Traditional Injera Base",
      icon: "🍞",
      badge: "Choose 1",
      columns: 1,
      options: [
        {
          value: "standard",
          title: "Standard Teff & Barley Blend",
          description: "Spongy, tart sourdough, naturally soft (traditional)",
          note: "Included",
        },
        {
          value: "pure-teff",
          title: "100% Pure Organic Brown Teff",
          description: "Naturally 100% gluten-free, iron-rich nutty grain",
          note: "+ETB 60",
        },
      ],
    },
    {
      key: "sides",
      step: 3,
      title: "Complimentary Side Accents",
      icon: "🥗",
      badge: "1/2 selected",
      columns: 2,
      multi: true,
      max: 2,
      options: [
        {
          value: "ayib",
          title: "Fresh Ayib",
          description: "Mild fresh cottage curd",
          note: "Free",
        },
        {
          value: "gomen",
          title: "Stewed Gomen",
          description: "Garlic-infused collard greens",
          note: "Free",
        },
        {
          value: "awaze",
          title: "House Awaze Paste",
          description: "Aged tej and berbere sauce",
          note: "Free",
        },
        {
          value: "egg",
          title: "Extra Braised Egg",
          description: "Slow-cooked in the wat broth",
          note: "+ETB 40",
        },
      ],
    },
  ],
  defaults: { heat: "traditional", injera: "standard", sides: ["ayib"] },
};

export const pairing = {
  eyebrow: "Gursha Pairings",
  title: "Pairs Wonderfully With Royal Doro Wat",
  lede: "Harmonize rich, spicy berbere with the cooling sweetness of golden honey wine, refreshing salads, and ceremonial jebena buna.",
  items: [
    {
      name: "House Traditional Tej",
      price: "350",
      description:
        "Pure golden fermented highland honey wine infused with gesho leaves. Served in a traditional round-bottom flask.",
      image: photo("1514362545857-3bc16c4c7d1b", 500),
      label: { text: "Signature Sip", tone: "gold" },
    },
    {
      name: "Fresh Timatim Fitfit",
      price: "180",
      description:
        "Crisp ripe heirloom tomatoes, minced red shallots, and sliced green peppers tossed with torn cold injera.",
      image: photo("1591814468924-caf88d1232e1", 500),
      label: { text: "Vegan / Tsom", tone: "green" },
    },
    {
      name: "Jebena Spiced Coffee",
      price: "70",
      description:
        "Addis-style freshly pan-roasted Yirgacheffe arabica beans boiled in clay jebena with a hint of tenadam rue.",
      image: photo("1447933601403-0c6688de566e", 500),
      label: { text: "Fresh Roast", tone: "dark" },
    },
  ],
};

export const closingBand = {
  icon: <FaLeaf />,
  title: "The Spirit of Gursha",
  text: "Sharing a bite directly into a companion's mouth is an act of deep hospitality and bond. Ask your server for communal Mesob presentation.",
  action: { label: "Explore Full Feast Menu", to: "/menu" },
};

export const simmerIcon = <FaClock />;
