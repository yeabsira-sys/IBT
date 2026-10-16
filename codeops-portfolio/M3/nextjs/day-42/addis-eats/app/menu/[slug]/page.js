import { notFound } from "next/navigation";
import DishPageContent from "../../../components/DishPageContent";

const MENU_API = "https://addis-eats-backend.onrender.com/menu";

export async function generateStaticParams() {
  try {
    const response = await fetch(MENU_API, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return [];
    }

    const result = await response.json();
    const dishes = Array.isArray(result) ? result : (result?.data ?? []);

    return dishes.map((dish) => ({
      slug: String(dish.slug),
    }));
  } catch {
    return [];
  }
}

export default async function DishPage({ params }) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  return <DishPageContent slug={slug} />;
}
