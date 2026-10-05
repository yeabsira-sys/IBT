import Link from "next/link";

export default function DishList({ dishes }) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {dishes.map((dish) => (
        <article key={dish.id} className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-orange-700">{dish.category}</p>
          <h2 className="mt-2 text-xl font-bold">{dish.name}</h2>
          <p className="mt-2 text-sm text-gray-600">{dish.description}</p>
          <p className="mt-4 font-bold">{dish.price} ETB</p>

          <Link
            href={`/menu/${dish.id}`}
            className="mt-4 inline-block rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
          >
            View dish
          </Link>
        </article>
      ))}
    </div>
  );
}