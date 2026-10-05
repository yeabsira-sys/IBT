"use client";

export default function Error({ error, reset }) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20 text-center">
      <h1 className="text-3xl font-bold">Something went wrong.</h1>
      <p className="mt-3 text-gray-600">
        The menu could not be loaded. This screen comes from app/menu/error.js.
      </p>

      <button
        onClick={() => reset()}
        className="mt-6 rounded-lg bg-orange-700 px-5 py-3 font-semibold text-white"
      >
        Try again
      </button>
    </main>
  );
}
