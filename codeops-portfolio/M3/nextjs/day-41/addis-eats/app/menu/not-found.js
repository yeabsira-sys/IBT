import Link from "next/link";

export default function DishNotFound() {
  return <main className="container section"><div className="empty-state"><h2>Dish not found</h2><p>That dish may no longer be on the menu.</p><Link className="btn" href="/menu">Back to menu</Link></div></main>;
}
