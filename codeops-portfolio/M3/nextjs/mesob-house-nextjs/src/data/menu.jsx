import { FaLeaf, FaPepperHot, FaWheatAwn } from "react-icons/fa6";

export const menuHero = {
  eyebrow: "Handcrafted Gondar & Addis Spices",
  title: "Our Complete Culinary Heritage",
  lede:
    "Every dish is prepared daily from scratch using sun-dried spices, stone-ground legume flours, and clarified herbal butter sourced directly from highland farm cooperatives.",
  searchPlaceholder: "Search dishes by name (e.g. Kitfo, Shiro, Tibs, Doro Wat)…",
  badges: [
    { text: "100% Pure Teff Injera", tone: "gold", icon: <FaWheatAwn /> },
    { text: "Fasting / Tsom Friendly", tone: "green", icon: <FaLeaf /> },
    { text: "Berbere Spiced", tone: "brand", icon: <FaPepperHot /> },
  ],
};

export const communal = {
  title: "Experience Communal Dining Around the Mesob",
  text: "All platters are served with unlimited warm teff injera rolls and fresh house-made ayib.",
  action: { label: "Reserve a Group Mesob Table", to: "/cart" },
};

export const stickyNote = "Communal injera included · Ready for banquet checkout";
