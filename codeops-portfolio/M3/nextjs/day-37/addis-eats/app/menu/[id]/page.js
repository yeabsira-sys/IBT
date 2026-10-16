import Link from "next/link";
import { notFound } from "next/navigation";

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

export default async function DishPage({ params }) {
  const { id } = await params;

  const dish = dishes.find((dish) => dish.id === id);

  if (!dish) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-orange-50 px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/menu"
          className="text-sm font-medium text-orange-700 hover:text-orange-800"
        >
          ← Back to Menu
        </Link>

        <article className="mt-6 rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-orange-600">
            Addis Eats
          </p>

          <h1 className="mt-2 text-4xl font-bold text-gray-900">{dish.name}</h1>

          <p className="mt-4 text-lg leading-7 text-gray-600">
            {dish.description}
          </p>

          <p className="mt-6 text-2xl font-bold text-orange-700">
            {dish.price} ETB
          </p>

          <div className="mt-8 flex gap-3">
            <Link
              href="/menu"
              className="rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700"
            >
              Back to Menu
            </Link>

            <Link
              href="/cart"
              className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cart
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}
