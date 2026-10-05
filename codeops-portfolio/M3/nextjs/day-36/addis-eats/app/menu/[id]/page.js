import Link from "next/link";
import { notFound } from "next/navigation";
import { getDish } from "../dishes";

export default function DishPage({ params }) {
  const { id } = params;
  const dish = getDish(id);

  if (!dish) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/menu" className="text-sm font-semibold text-orange-700">
        ← Back to menu
      </Link>

      <article className="mt-8 rounded-2xl border bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-orange-700">{dish.category}</p>
        <h1 className="mt-2 text-4xl font-bold">{dish.name}</h1>
        <p className="mt-5 text-gray-600">{dish.description}</p>
        <p className="mt-6 text-2xl font-bold">{dish.price} ETB</p>
      </article>
    </main>
  );
}
