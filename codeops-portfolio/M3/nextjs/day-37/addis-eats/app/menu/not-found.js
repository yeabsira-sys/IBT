import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-orange-50 px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-4xl font-bold text-gray-900">Dish Not Found</h1>

        <p className="mt-3 text-gray-600">
          The dish you are looking for does not exist.
        </p>

        <Link
          href="/menu"
          className="mt-6 inline-block rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700"
        >
          Back to Menu
        </Link>
      </div>
    </main>
  );
}
