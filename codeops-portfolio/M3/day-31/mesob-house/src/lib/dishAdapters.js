const photo = (id, w = 700) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

// The API doesn't return a photo for each dish yet

const IMAGE_BY_SLUG = {
  "doro-wat": photo("1580651315530-69c8e0026377"),
  "siga-derek-tibs": photo("1604909052743-94e838986d24"),
  "prime-beef-kitfo": photo("1543353071-873f17a7a088"),
  "full-vegan-beyaynetu": photo("1591814468924-caf88d1232e1"),
  "house-tej-carafe": photo("1514362545857-3bc16c4c7d1b"),
};
const FALLBACK_IMAGE = photo("1567364816519-cbc9c4ffe1eb");

export function getDishImage(slug) {
  return IMAGE_BY_SLUG[slug] ?? FALLBACK_IMAGE;
}

export function mapApiDishToCard(dish) {
  return {
    id: dish.slug,
    name: dish.nameEn,
    nativeName: dish.nameAm,
    price: String(dish.priceETB),
    description: dish.description,
    image: getDishImage(dish.slug),
    label: dish.isFasting
      ? { text: "Fasting / Vegan", tone: "green" }
      : dish.isSpecial
        ? { text: "Chef's Special", tone: "gold" }
        : { text: dish.category, tone: "brand" },
    heat: dish.spiceLevel,
    category: dish.category,
    tags: [dish.isFasting ? "fasting" : "popular"],
  };
}
