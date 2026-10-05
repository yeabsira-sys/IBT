import Link from "next/link";

export default function CartPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-4xl font-bold">Your Cart</h1>
      <p className="mt-3 text-gray-600">
        Your cart is currently empty in this Day 36 routing exercise.
      </p>

      <Link
        href="/checkout"
        className="mt-6 inline-block rounded-lg bg-orange-700 px-5 py-3 font-semibold text-white"
      >
        Continue to Checkout
      </Link>
    </main>
  );
}