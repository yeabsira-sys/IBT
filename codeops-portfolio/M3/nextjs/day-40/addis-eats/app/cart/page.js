"use client";

import Link from "next/link";
import { useCart } from "../../context/CartProvider";

export default function CartPage() {
  const { items, total, updateQuantity, removeFromCart, ready } = useCart();
  if (!ready) return <main className="container loading-state"><div className="spinner" /></main>;

  return (
    <main className="container">
      <div className="page-heading"><span className="eyebrow">Almost yours</span><h1>Your cart</h1><p>Take one last look before checking out.</p></div>
      {!items.length ? <div className="empty-state"><h2>Your cart is waiting</h2><p>Explore the menu and add something delicious.</p><Link className="btn" href="/menu">Explore the menu</Link></div> :
        <div className="cart-layout">
          <section className="panel">
            <h2>Your items ({items.reduce((n, item) => n + item.quantity, 0)})</h2>
            {items.map((item) => <article className="cart-item" key={item.id}>
              <img src={item.image} alt={item.name} />
              <div><h3>{item.name}</h3><p>{Number(item.price).toLocaleString()} ETB each</p>
                <div className="quantity-control">
                  <button aria-label={`Decrease ${item.name}`} onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                  <strong>{item.quantity}</strong>
                  <button aria-label={`Increase ${item.name}`} onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                </div>
              </div>
              <div><strong className="price">{(Number(item.price) * item.quantity).toLocaleString()} ETB</strong><br /><button className="muted" style={{ border: 0, background: "transparent", textDecoration: "underline", marginTop: 8 }} onClick={() => removeFromCart(item.id)}>Remove</button></div>
            </article>)}
          </section>
          <aside className="order-summary">
            <h2>Order summary</h2>
            <div className="summary-line"><span>Subtotal</span><span>{total.toLocaleString()} ETB</span></div>
            <div className="summary-line"><span>Delivery</span><span>Calculated at checkout</span></div>
            <div className="summary-line total"><span>Total</span><span>{total.toLocaleString()} ETB</span></div>
            <Link className="btn btn-block" href="/checkout" style={{ marginTop: 18 }}>Continue to checkout →</Link>
            <Link className="btn btn-secondary btn-block" href="/menu" style={{ marginTop: 10 }}>Add more items</Link>
          </aside>
        </div>}
    </main>
  );
}
