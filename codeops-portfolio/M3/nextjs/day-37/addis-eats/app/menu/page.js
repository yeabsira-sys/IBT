import Link from "next/link";
import CategoryBar from "./components/CategoryBar";
import DishList from "./components/DishList";

export default function MenuPage() {
  return (
    <main className="min-h-screen bg-orange-50 px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Menu</h1>

            <p className="mt-2 text-gray-600">Choose your favorite dish.</p>
          </div>

          <Link
            href="/"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Home
          </Link>
        </div>

        <CategoryBar />

        <DishList />
      </div>
    </main>
  );
}
