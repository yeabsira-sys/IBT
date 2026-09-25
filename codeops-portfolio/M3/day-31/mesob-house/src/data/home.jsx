/* Every string on the home page lives here. Swap these for API data and no
   component needs to change. */

const photo = (id, w = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

export const announcement = {
  message:
    "Tsom / Fasting Observance: 12-item Royal Beyaynetu vegan platter simmered fresh all day.",
  note: "100% pure teff injera available",
  action: { label: "See fasting specialties", href: "/menu" },
};

export const guest = { name: "Genet Alemu", greeting: "Welcome" };

export const hero = {
  badge: "Traditional Habesha Hearth",
  title: "Communal Warmth,",
  titleAccent: "Slow-Cooked Heritage.",
  lede: "Handcrafted wats, ancient stone-ground teff injera, and 72-hour simmered stews infused with nitre kibbeh and heirloom berbere harvested from the Ethiopian highlands.",
  primaryAction: { label: "Explore today's specials", to: "/menu" },
  secondaryAction: { label: "Full banquet menu", to: "/menu" },
  ceremonyNote: "Coffee ceremony · 4:00 PM daily",
  stats: [
    { figure: "100%", caption: "Stone-ground white teff" },
    { figure: "6+ hours", caption: "Slow clay-pot simmer" },
    { figure: "Gursha", caption: "Hospitality shared by hand" },
  ],
  image: photo("1567364816519-cbc9c4ffe1eb"),
  imageAlt: "A shared mesob platter of injera, wats and greens",
  imageNote: { title: "Stone ground", text: "Fresh berbere pepper" },
  featured: {
    label: "Our table's icon",
    name: "Great Mesob Feast",
    currency: "ETB",
    price: "1,650",
  },
};

// export const specials = {
//   eyebrow: "From the clay pots",
//   title: "Today's Curated Chef Specials",
//   lede:
//     "Carefully balanced stews prepared in slow-burning clay pots, served piping hot on hand-stretched injera.",
//   filters: [
//     { value: "all", label: "All" },
//     { value: "popular", label: "Popular" },
//     { value: "fasting", label: "Fasting (Tsom)" },
//   ],
//   dishes: [
//     {
//       id: "doro-wat",
//       name: "Royal Doro Wat",
//       price: "550",
//       description:
//         "Free-range poultry slow-simmered for six hours in clarified nitre kibbeh, organic spiced butter, bitter kibbeh, house-cured berbere and ayib.",
//       image: photo("1580651315530-69c8e0026377", 700),
//       label: { text: "Chef's special today", tone: "gold" },
//       heat: "Spicy",
//       tags: ["popular"],
//     },
//     {
//       id: "meat-combo",
//       name: "Mesob Meat Combo",
//       price: "990",
//       description:
//         "The ultimate highland feast: siga tibs, prime kitfo cuts, derek tibs with rosemary, garlic and fresh jalapeño, served on a shared mesob tray.",
//       image: photo("1604909052743-94e838986d24", 700),
//       label: { text: "Chef's special today", tone: "gold" },
//       heat: "Medium heat",
//       tags: ["popular"],
//     },
//     {
//       id: "beyaynetu",
//       name: "Special Fasting Beyaynetu",
//       price: "480",
//       description:
//         "A colourful spectrum of twelve fasting-season dishes: misir wat, spicy shiro, kik alicha, gomen, tikil gomen and more, built on pure teff injera.",
//       image: photo("1591814468924-caf88d1232e1", 700),
//       label: { text: "100% pure teff", tone: "green" },
//       heat: "Fasting / vegan",
//       tags: ["fasting"],
//     },
//   ],
// };

export const gursha = {
  eyebrow: "The spirit of gursha",
  quote: "Those Who Share a Mesob Never Walk Alone.",
  body: "Gursha is the cherished act of honouring a companion by rolling choice morsels of wat with warm injera and feeding them directly by hand. At Mesob House, every table is configured for communal warmth and slow gratitude.",
  ceremony: {
    title: "Authentic clay jebena buna ceremony",
    text: "Every day at 4:00 PM. Watch our own green coffee beans roast over clay coals, ground fresh by hand, then brewed in a traditional clay jebena and poured with popcorn and frankincense.",
    action: { label: "Reserve ceremony seating", href: "/ceremony" },
  },
  beverages: [
    {
      name: "Golden Tej (Honey Wine)",
      price: "550",
      description:
        "Crafted in-house using wild Ethiopian wildflower honey and dried gesho, cold-aged for 21 days in glass and served in a berele.",
      note: "Served in a berele · 11% ABV",
      tag: { text: "House-fermented", tone: "gold" },
      action: "Add berele",
    },
    {
      name: "Highland Spiced Shai",
      price: "90",
      description:
        "Slow-simmered highland black tea leaves infused with crushed cinnamon bark, fragrant cardamom pods, cloves and a hint of wild ginger.",
      note: "Served with raw honey",
      tag: { text: "Daily infusion", tone: "mint" },
      action: "Add shai",
    },
  ],
  addOn: {
    name: "Extra teff injera rolls (basket of 3)",
    description:
      "Naturally gluten-friendly ancient grain, fermented three days for its signature tang.",
    price: "90",
    action: "Add extra",
  },
};

export const reflections = {
  eyebrow: "Voices around the mesob",
  title: "Honored Guest Reflections",
  reviews: [
    {
      rating: 5,
      quote:
        "The doro wat was so reminiscent of my grandmother's cooking in Gondar. The berbere depth and the slow-simmered aroma are impossible to find elsewhere.",
      name: "Amanuel Mengistu",
      role: "Bole resident & feast patron",
    },
    {
      rating: 5,
      quote:
        "Their fasting beyaynetu is unmatched on Wednesdays. Twelve vibrant dishes, and the tikil gomen was still steaming in the clay. True culinary devotion.",
      name: "Sara Tesfaye",
      role: "Plant-based dining advocate",
    },
    {
      rating: 5,
      quote:
        "We hosted a fifteen-person family reunion around their largest communal mesob. The coffee ceremony with fresh frankincense made the evening unforgettable.",
      name: "Dr. Kebede Wolde",
      role: "Diaspora homecoming guest",
    },
  ],
};

export const closingCta = {
  eyebrow: "Join our table",
  title: "Experience Authentic Habesha Warmth Tonight",
  text: "Whether you are gathering around our circular mesob for communal dining or ordering freshly baked injera to your home in Addis Ababa.",
  actions: [
    { label: "Book a mesob table", to: "/cart" },
    { label: "View complete menu", to: "/menu" },
  ],
};

export const dietaryColumn = {
  heading: "Dietary Traditions",
  items: [
    { label: "Vegan Fasting (Beyaynetu / Tsom)", href: "/menu?diet=fasting" },
    { label: "Traditional Prime Meat Feasts", href: "/menu?diet=meat" },
    { label: "House Tej (Pure Honey Wine)", href: "/menu?category=drinks" },
    { label: "Jebena Buna Roasting Ceremony", href: "/ceremony" },
  ],
};
