import { notFound } from "next/navigation";
import Link from "next/link";

export default async function DishPage({ params }) {
  const { id } = await params;

  const response = await fetch(`https://addis-eats-backend.onrender.com/menu`);

  if (!response.ok) {
    notFound();
  }

  const result = await response.json();

  let dish = result.data;

  if (!dish) {
    notFound();
  }
  dish = dish.find((dish) => dish.id === id);
  if (!dish) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold">{dish.name}</h1>

      <p className="mt-4 text-gray-600">{dish.description}</p>

      <p className="mt-4 text-xl font-bold">{dish.price} ETB</p>
      <Link
        href="/menu"
        className="mt-6 inline-block rounded-lg bg-orange-500 px-5 py-2 text-white"
      >
        Back to Menu
      </Link>
    </main>
  );
}
