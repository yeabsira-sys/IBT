"use client";

export default function Error({ reset }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-orange-50 px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-3xl font-bold text-red-600">
          Something went wrong
        </h1>

        <p className="mt-3 text-gray-600">We could not load the menu.</p>

        <button
          onClick={() => reset()}
          className="mt-6 rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700"
        >
          Try Again
        </button>
      </div>
    </main>
  );
}
