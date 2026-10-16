import CategoryBar from "./components/CategoryBar";
import DishList from "./components/DishList";

export default async function MenuPage() {
  const response = await fetch("https://addis-eats-backend.onrender.com/menu");

  if (!response.ok) {
    // console.log(response);
    throw new Error("Failed to fetch menu");
  }

  const result = await response.json();

  const dishes = result.data;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Addis Eats Menu</h1>

      <CategoryBar />

      <DishList dishes={dishes} />
    </main>
  );
}
