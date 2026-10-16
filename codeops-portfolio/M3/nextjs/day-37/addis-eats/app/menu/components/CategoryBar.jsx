"use client";

export default function CategoryBar() {
  const categories = ["All", "Breakfast", "Lunch", "Dinner", "Drinks"];

  return (
    <div className="mb-8 rounded-xl bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Categories</h2>

      <div className="flex flex-wrap gap-3">
        {categories.map((category) => (
          <button
            key={category}
            className="rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 transition hover:bg-orange-600 hover:text-white"
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}
