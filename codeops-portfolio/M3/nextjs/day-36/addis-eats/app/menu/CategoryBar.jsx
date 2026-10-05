import Link from "next/link";

export default function CategoryBar() {
  return (
    <div className="mb-8 flex flex-wrap gap-3">
      <Link href="/menu" className="rounded-full border bg-white px-4 py-2 text-sm">
        All
      </Link>
      <Link
        href="/menu?category=Vegan"
        className="rounded-full border bg-white px-4 py-2 text-sm"
      >
        Vegan
      </Link>
      <Link
        href="/menu?category=Ethiopian"
        className="rounded-full border bg-white px-4 py-2 text-sm"
      >
        Ethiopian
      </Link>
    </div>
  );
}