export const dishes = [
  {
    id: "kitfo",
    name: "Kitfo",
    category: "Ethiopian",
    price: 280,
    description: "Minced beef seasoned with Ethiopian spices and served with ayib."
  },
  {
    id: "doro-wot",
    name: "Doro Wot",
    category: "Ethiopian",
    price: 320,
    description: "Spicy Ethiopian chicken stew served with injera."
  },
  {
    id: "vegan-beyaynetu",
    name: "Vegan Beyaynetu",
    category: "Vegan",
    price: 240,
    description: "A colorful combination of Ethiopian vegetarian dishes served with injera."
  }
];

export function getDish(id) {
  return dishes.find((dish) => dish.id === id);
}