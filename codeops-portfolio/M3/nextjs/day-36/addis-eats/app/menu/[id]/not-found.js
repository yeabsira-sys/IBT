import Link from "next/link";

export default function DishNotFound() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20 text-center">
      <h1 className="text-4xl font-bold">Dish not found</h1>
      <p className="mt-3 text-gray-600">
        We could not find that dish in the Addis Eats menu.
      </p>

      <Link
        href="/menu"
        className="mt-6 inline-block rounded-lg bg-orange-700 px-5 py-3 font-semibold text-white"
      >
        Return to menu
      </Link>
    </main>
  );
}