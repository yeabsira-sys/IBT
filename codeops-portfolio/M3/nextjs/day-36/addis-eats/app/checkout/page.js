import Link from "next/link";

export default function CheckoutPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-4xl font-bold">Checkout</h1>
      <p className="mt-3 text-gray-600">
        This is the checkout route from the Addis Eats route tree.
      </p>

      <Link
        href="/menu"
        className="mt-6 inline-block rounded-lg border px-5 py-3 font-semibold"
      >
        Back to Menu
      </Link>
    </main>
  );
}