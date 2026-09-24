import { FaBellConcierge } from "react-icons/fa6";

const photo = (id, w = 500) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

export const notFoundHero = {
  eyebrow: "Table Not Set · Error",
  lede: "Looks like this dish has already been enjoyed or never made it to the kitchen!",
  message:
    "Even the best Gursha sometimes slips! Don't let your appetite wait — our Addis kitchen has hot clay pot wats and freshly rolled teff injera ready for your table right now.",
  actions: {
    primary: { label: "Return to Today's Specials", to: "/menu" },
    secondary: { label: "Explore Full Menu", to: "/menu" },
    tertiary: { label: "Check Current Order", to: "/cart" },
  },
};

export const suggested = {
  eyebrow: "House Favorites",
  title: "Hungry? Here's What Our Guests Love Today",
  viewAllLabel: "View 28 Traditional Dishes",
  viewAllHref: "/menu",
  dishes: [
    {
      id: "doro-wat",
      name: "Doro Wat",
      price: "650",
      description: "Slow-simmered farm chicken in rich caramelized shallots, 12-spice berbere, and organic butter.",
      image: photo("1580651315530-69c8e0026377"),
      label: { text: "Spicy Favorite", tone: "brand" },
      note: "Served with 2x Teff Injera",
    },
    {
      id: "derek-tibs",
      name: "Derek Tibs",
      price: "620",
      description: "Prime tenderloin beef seared with fresh mountain rosemary, sliced green jalapeños, garlic, and served with…",
      image: photo("1604909052743-94e838986d24"),
      label: { text: "Sizzling Clay", tone: "gold" },
      note: "Mild or Fiery Crisp",
    },
    {
      id: "shiro-clay-pot",
      name: "Shiro Clay Pot",
      price: "450",
      description: "Stone-ground spiced chickpeas gently simmered with garlic, shallots, and fresh herbs in a boiling clay pot…",
      image: photo("1591814468924-caf88d1232e1"),
      label: { text: "Vegan / Tsom", tone: "green" },
      note: "100% Plant Based",
    },
  ],
};

export const concierge = {
  icon: <FaBellConcierge />,
  title: "Lost your table or need personalized dietary recommendations?",
  text: "Our concierge in Bole Medhanialem is delighted to prepare your banquet.",
  phone: "+251 911 234 567",
  reserveLabel: "Reserve",
};
