import Link from "next/link";

export default function CategoryBar() {
  return (
    <nav className="mb-8 flex gap-3">
      <Link href="/menu" className="rounded-full bg-orange-100 px-4 py-2">
        All
      </Link>

      <Link
        href="/menu?category=breakfast"
        className="rounded-full bg-orange-100 px-4 py-2"
      >
        Breakfast
      </Link>

      <Link
        href="/menu?category=lunch"
        className="rounded-full bg-orange-100 px-4 py-2"
      >
        Lunch
      </Link>
    </nav>
  );
}
