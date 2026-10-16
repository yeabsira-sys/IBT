"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "../../context/CartProvider";

export default function CheckoutPage() {
  const { items, total, clearCart, ready } = useCart();
  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "" });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  function update(event) { setForm({ ...form, [event.target.name]: event.target.value }); }
  function submit(event) {
    event.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = "Please enter your name.";
    if (!/^[0-9+\-\s]{9,15}$/.test(form.phone.trim())) next.phone = "Enter a valid phone number.";
    if (!form.address.trim()) next.address = "Please enter your delivery address.";
    setErrors(next);
    if (Object.keys(next).length === 0) {
      // Demo checkout only. Connect this handler to your order API before accepting real orders.
      setSubmitted(true);
      clearCart();
    }
  }

  if (!ready) return <main className="container loading-state"><div className="spinner" /></main>;
  if (submitted) return <main className="container section"><div className="empty-state"><span className="eyebrow">Thank you</span><h2>Order details received</h2><p>This is a demo confirmation. No order was sent to a backend yet.</p><Link href="/menu" className="btn">Back to menu</Link></div></main>;

  return (
    <main className="container">
      <div className="page-heading"><span className="eyebrow">One last step</span><h1>Checkout</h1><p>Where should we bring your order?</p></div>
      {!items.length ? <div className="empty-state"><h2>Your cart is empty</h2><p>Add dishes before proceeding to checkout.</p><Link href="/menu" className="btn">Browse menu</Link></div> :
        <div className="checkout-layout" style={{ paddingBottom: 30 }}>
          <section className="panel">
            <h2>Delivery information</h2>
            <form onSubmit={submit} noValidate>
              <div className="form-grid">
                <div className="form-field full"><label htmlFor="name">Full name</label><input id="name" name="name" autoComplete="name" value={form.name} onChange={update} aria-invalid={!!errors.name} />{errors.name && <span className="error-message">{errors.name}</span>}</div>
                <div className="form-field full"><label htmlFor="phone">Phone number</label><input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="09…" value={form.phone} onChange={update} aria-invalid={!!errors.phone} />{errors.phone && <span className="error-message">{errors.phone}</span>}</div>
                <div className="form-field full"><label htmlFor="address">Delivery address</label><textarea id="address" name="address" autoComplete="street-address" value={form.address} onChange={update} aria-invalid={!!errors.address} />{errors.address && <span className="error-message">{errors.address}</span>}</div>
                <div className="form-field full"><label htmlFor="notes">Order notes (optional)</label><textarea id="notes" name="notes" value={form.notes} onChange={update} /></div>
              </div>
              <button className="btn btn-block" type="submit" style={{ marginTop: 22 }}>Confirm order · {total.toLocaleString()} ETB</button>
            </form>
          </section>
          <aside className="order-summary"><h2>Your order</h2>{items.map((item) => <div className="summary-line" key={item.id}><span>{item.name} × {item.quantity}</span><strong>{(item.price * item.quantity).toLocaleString()} ETB</strong></div>)}<div className="summary-line total"><span>Total</span><span>{total.toLocaleString()} ETB</span></div><p className="muted" style={{ fontSize: ".85rem", marginTop: 12 }}>Demo checkout: connect your order API before production use.</p></aside>
        </div>}
    </main>
  );
}
