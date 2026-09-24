import { FaLeaf, FaPepperHot, FaWheatAwn } from "react-icons/fa6";

const photo = (id, w = 500) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

export const menuHero = {
  eyebrow: "Handcrafted Gondar & Addis Spices",
  title: "Our Complete Culinary Heritage",
  lede: "Every dish is prepared daily from scratch using sun-dried spices, stone-ground legume flours, and clarified herbal butter sourced directly from highland farm cooperatives.",
  searchPlaceholder:
    "Search dishes by name (e.g. Kitfo, Shiro, Tibs, Doro Wat)…",
  badges: [
    { text: "100% Pure Teff Injera", tone: "gold", icon: <FaWheatAwn /> },
    { text: "Fasting / Tsom Friendly", tone: "green", icon: <FaLeaf /> },
    { text: "Berbere Spiced", tone: "brand", icon: <FaPepperHot /> },
  ],
};

// export const categories = [
//   { value: "all", label: "All Dishes", count: 24 },
//   { value: "stews", label: "Traditional Stews & Wat", count: 8 },
//   { value: "grills", label: "Tibs & Grills", count: 5 },
//   { value: "fasting", label: "Fasting & Vegan / Tsom", count: 6 },
//   { value: "kitfo", label: "Raw & Cured Delicacies / Kitfo", count: 3 },
//   { value: "drinks", label: "Beverages & Tej", count: 6 },
// ];

// export const dishes = [
//   {
//     id: "special-doro-wat",
//     name: "Special Doro Wat",
//     price: "650",
//     description:
//       "Slow-cooked tender chicken leg quarter simmered for 12 hours with sweet onions, aged berbere gravy, and whole spiced egg.",
//     image: photo("1580651315530-69c8e0026377"),
//     label: { text: "Highland Classic", tone: "dark" },
//     category: "stews",
//   },
//   {
//     id: "prime-beef-kitfo",
//     name: "Prime Beef Kitfo",
//     price: "720",
//     description:
//       "Minced lean beef seasoned in fiery mitmita and warm herb-infused niter kibbeh (clarified butter), served with ayib.",
//     image: photo("1604909052743-94e838986d24"),
//     label: { text: "Chef's Heritage", tone: "gold" },
//     category: "kitfo",
//   },
//   {
//     id: "siga-tibs",
//     name: "Siga Tibs",
//     price: "620",
//     description:
//       "Tender prime beef cubes flash-sautéed with fresh rosemary, sweet shallots, garlic cloves, and sliced mild jalapeño.",
//     image: photo("1543353071-873f17a7a088"),
//     label: { text: "Pan-Seared", tone: "brand" },
//     category: "grills",
//   },
//   {
//     id: "clay-pot-shiro-bozena",
//     name: "Clay-pot Shiro Bozena",
//     price: "450",
//     description:
//       "Silky spiced chickpea flour stew simmered slowly with diced dried beef bits and served bubbling hot in a clay pot.",
//     image: photo("1596797038530-2c107229654b"),
//     label: { text: "Clay Pot", tone: "gold" },
//     category: "stews",
//   },
//   {
//     id: "full-vegan-beyaynetu",
//     name: "Full Vegan Beyaynetu",
//     price: "480",
//     description:
//       "Grand rainbow tasting platter composed of Misir Wat, Kik Alicha, braised Gomen, sweet Fosolia with carrots, Atakilt Wat…",
//     image: photo("1591814468924-caf88d1232e1"),
//     label: { text: "100% Vegan / Tsom", tone: "green" },
//     category: "fasting",
//   },
//   {
//     id: "awaze-lamb-tibs",
//     name: "Awaze Lamb Tibs",
//     price: "680",
//     description:
//       "Marinated grass-fed highland lamb cubes pan-seared with house-made fiery awaze pepper paste, garlic…",
//     image: photo("1544025162-d76694265947"),
//     label: { text: "Awaze Glaze", tone: "dark" },
//     category: "grills",
//   },
//   {
//     id: "gored-gored",
//     name: "Gored Gored",
//     price: "750",
//     description:
//       "Succulent cubed raw tenderloin rolled in fiery mitmita chili blend and infused with melted herbal niter kibbeh. Served with…",
//     image: photo("1432139555190-58524dae6a55"),
//     label: { text: "Purist Favorite", tone: "brand" },
//     category: "kitfo",
//   },
//   {
//     id: "house-tej-carafe",
//     name: "House Tej (Carafe)",
//     price: "350",
//     description:
//       "Traditional golden mead naturally fermented for 21 days with pure highland wildflower honey and bitter gesho wood.",
//     image: photo("1514362545857-3bc16c4c7d1b"),
//     label: { text: "Fermented In-House", tone: "gold" },
//     category: "drinks",
//   },
// ];

export const communal = {
  title: "Experience Communal Dining Around the Mesob",
  text: "All platters are served with unlimited warm teff injera rolls and fresh house-made ayib.",
  action: { label: "Reserve a Group Mesob Table", to: "/cart" },
};

export const stickyNote =
  "Communal injera included · Ready for banquet checkout";
