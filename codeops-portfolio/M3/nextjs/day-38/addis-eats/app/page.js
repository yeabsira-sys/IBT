import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-orange-50 px-6 py-16">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold text-orange-700">
          Welcome to Addis Eats
        </h1>

        <p className="mt-4 text-lg text-gray-600">
          Discover delicious Ethiopian dishes.
        </p>

        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/menu"
            className="rounded-lg bg-orange-600 px-6 py-3 font-semibold text-white hover:bg-orange-700"
          >
            View Menu
          </Link>

          <Link
            href="/cart"
            className="rounded-lg border border-orange-600 px-6 py-3 font-semibold text-orange-700 hover:bg-orange-100"
          >
            Cart
          </Link>

          <Link
            href="/checkout"
            className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-100"
          >
            Checkout
          </Link>
        </div>
      </div>
    </main>
  );
}
