import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20 text-center">
      <h1 className="text-5xl font-bold">404</h1>
      <p className="mt-3 text-gray-600">
        The page you requested does not exist.
      </p>

      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-orange-700 px-5 py-3 font-semibold text-white"
      >
        Go Home
      </Link>
    </main>
  );
}