import Link from "next/link";
import { requireSession } from "../../lib/auth";
import { getOrdersFor } from "../../lib/orders";
import { signOut } from "../actions/auth";

export default async function OrdersPage() {
  const user = await requireSession();

  // Always query using the authenticated user's ID.
  const orders = await getOrdersFor(user.id);

  return (
    <main className="section">
      <div className="container">
        <div className="page-heading">
          <span className="eyebrow">Your account</span>
          <h1>My orders</h1>
          <p>Welcome, {user.name}.</p>
        </div>

        <form action={signOut}>
          <button type="submit" className="btn btn-secondary">
            Sign out
          </button>
        </form>

        {orders.length === 0 ? (
          <div className="empty-state">
            <h2>No orders yet</h2>
            <p>Your orders will appear here after checkout.</p>
            <Link href="/menu" className="btn btn-primary">
              Explore the menu
            </Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <article key={order.id} className="dish-card">
                <div className="dish-card-content">
                  <h2>{order.id}</h2>
                  <p>Status: {order.status}</p>
                  <p>Total: {order.totalETB.toLocaleString()} ETB</p>

                  <ul>
                    {order.items.map((item, index) => (
                      <li key={`${order.id}-${index}`}>
                        {item.name} × {item.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
