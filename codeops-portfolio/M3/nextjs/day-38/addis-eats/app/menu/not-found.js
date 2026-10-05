import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-4xl font-bold">Dish Not Found</h1>

      <p className="mt-4 text-gray-600">We could not find that dish.</p>

      <Link
        href="/menu"
        className="mt-6 inline-block rounded-lg bg-orange-500 px-5 py-2 text-white"
      >
        Back to Menu
      </Link>
    </main>
  );
}
