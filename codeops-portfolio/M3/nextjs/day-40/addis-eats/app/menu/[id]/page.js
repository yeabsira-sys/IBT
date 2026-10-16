import Link from "next/link";
import { notFound } from "next/navigation";
import DishDetailActions from "../../../components/DishDetailActions";
import { dishes } from "../dishes";

export function generateStaticParams() {
  return dishes.map((dish) => ({ id: String(dish.id) }));
}

export default async function DishPage({ params }) {
  const { id } = await params;
  const dish = dishes.find((item) => String(item.id) === String(id));
  if (!dish) notFound();

  return (
    <main className="section">
      <div className="container">
        <p style={{ marginBottom: 24, color: "var(--c-ink-muted)" }}><Link href="/">Home</Link> / <Link href="/menu">Menu</Link> / {dish.name}</p>
        <div className="dish-detail">
          <img className="dish-detail-image" src={dish.image} alt={dish.name} />
          <div className="dish-detail-copy">
            <span className="eyebrow">{dish.category}</span><h1>{dish.name}</h1>
            <p>{dish.description}</p>
            <div className="price">{Number(dish.price).toLocaleString()} ETB</div>
            <DishDetailActions dish={dish} />
            <p className="muted" style={{ fontSize: ".88rem" }}>Freshly prepared. Prices are shown in Ethiopian birr.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
