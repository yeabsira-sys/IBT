import Link from "next/link";

const dishes = [
  {
    id: "1",
    name: "Doro Wot",
    description: "Spicy Ethiopian chicken stew.",
    price: 450,
  },
  {
    id: "2",
    name: "Kitfo",
    description: "Minced beef seasoned with Ethiopian spices.",
    price: 500,
  },
  {
    id: "3",
    name: "Shiro Wot",
    description: "Delicious Ethiopian chickpea stew.",
    price: 250,
  },
];

export default function DishList() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {dishes.map((dish) => (
        <article
          key={dish.id}
          className="rounded-xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <h3 className="text-xl font-bold text-gray-900">{dish.name}</h3>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            {dish.description}
          </p>

          <div className="mt-5 flex items-center justify-between">
            <span className="font-bold text-orange-700">{dish.price} ETB</span>

            <Link
              href={`/menu/${dish.id}`}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
            >
              View Dish
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
