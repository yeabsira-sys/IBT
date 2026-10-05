import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      <div className="max-w-2xl">
        <p className="mb-3 font-semibold uppercase tracking-wider text-orange-700">
          Welcome
        </p>

        <h1 className="text-5xl font-bold tracking-tight">
          Discover food you love in Addis.
        </h1>

        <p className="mt-5 text-lg text-gray-600">
          Browse the Addis Eats menu, open a dish, view your cart, and continue
          to checkout.
        </p>

        <Link
          href="/menu"
          className="mt-8 inline-block rounded-lg bg-orange-700 px-6 py-3 font-semibold text-white hover:bg-orange-800"
        >
          Browse Menu
        </Link>
      </div>
    </main>
  );
}