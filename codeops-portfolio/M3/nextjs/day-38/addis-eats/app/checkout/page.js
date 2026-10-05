import Link from "next/link";

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-orange-50 px-6 py-12">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-4xl font-bold text-gray-900">Checkout</h1>

        <p className="mt-3 text-gray-600">Complete your order here.</p>

        <div className="mt-8 flex gap-3">
          <Link
            href="/cart"
            className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
          >
            Back to Cart
          </Link>

          <Link
            href="/menu"
            className="rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700"
          >
            Back to Menu
          </Link>
        </div>
      </div>
    </main>
  );
}
