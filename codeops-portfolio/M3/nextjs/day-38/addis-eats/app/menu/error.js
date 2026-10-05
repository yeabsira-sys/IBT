"use client";

export default function Error({ error, reset }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h2 className="text-2xl font-bold">Something went wrong!</h2>

      <button
        onClick={() => reset()}
        className="mt-6 rounded-lg bg-orange-500 px-5 py-2 text-white"
      >
        Try again
      </button>
    </main>
  );
}
