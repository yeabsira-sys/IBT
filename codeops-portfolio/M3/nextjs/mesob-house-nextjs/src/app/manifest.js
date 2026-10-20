export default function manifest() {
  return {
    name: "Mesob House",
    short_name: "Mesob",
    description: "Authentic Habesha dining and delivery in Addis Ababa.",
    start_url: "/",
    display: "standalone",
    background_color: "#fdf7f2",
    theme_color: "#8c2116",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
