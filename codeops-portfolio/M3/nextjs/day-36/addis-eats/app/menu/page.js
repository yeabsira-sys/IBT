import DishList from "./DishList";
import CategoryBar from "./CategoryBar";
import { dishes } from "./dishes";

export default async function MenuPage({ searchParams }) {
  // The delay makes loading.js easy to observe during the exercise.
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Visit /menu?error=1 to deliberately test error.js.
  if (searchParams.error === "1") {
    throw new Error("Demo menu error");
  }

  const category = searchParams.category;

  const filteredDishes = category
    ? dishes.filter((dish) => dish.category === category)
    : dishes;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-4xl font-bold">Our Menu</h1>
      <p className="mt-2 text-gray-600">
        Choose a dish and open its dynamic route.
      </p>

      <div className="mt-8">
        <CategoryBar />
        <DishList dishes={filteredDishes} />
      </div>
    </main>
  );
}