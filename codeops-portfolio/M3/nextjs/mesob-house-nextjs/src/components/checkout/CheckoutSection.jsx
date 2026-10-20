/**
 * CheckoutSection — the numbered white card wrapper shared by every step
 * on the checkout page: an icon, "N. Title", and a trailing badge/note.
 */
export default function CheckoutSection({ number, icon, title, trailing, children }) {
  return (
    <section className="checkout-card">
      <div className="checkout-card__head">
        <h2>
          <span className="checkout-card__icon" aria-hidden="true">
            {icon}
          </span>
          {number}. {title}
        </h2>
        {trailing && <span className="checkout-card__trailing">{trailing}</span>}
      </div>
      {children}
    </section>
  );
}
