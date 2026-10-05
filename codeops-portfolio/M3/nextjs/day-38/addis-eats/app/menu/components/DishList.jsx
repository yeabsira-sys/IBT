import Link from "next/link";

export default function DishList({ dishes }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {dishes.map((dish) => (
        <article key={dish.id} className="rounded-xl bg-white p-5 shadow">
          <h2 className="text-xl font-semibold">{dish.name}</h2>

          <p className="mt-2 text-gray-600">{dish.description}</p>

          <p className="mt-4 font-bold">{dish.price} ETB</p>

          <Link
            href={`/menu/${dish.id}`}
            className="mt-4 inline-block rounded-lg bg-orange-500 px-4 py-2 text-white"
          >
            View Dish
          </Link>
        </article>
      ))}
    </div>
  );
}
