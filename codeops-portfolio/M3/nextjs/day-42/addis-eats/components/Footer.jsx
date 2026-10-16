import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-about">
            <Link href="/" className="brand"><span className="brand-mark">M</span><span>Mesob House</span></Link>
            <p>Good food, warm coffee, and Ethiopian hospitality. Your table is always waiting.</p>
          </div>
          <div className="footer-column">
            <h3>Explore</h3>
            <div className="footer-links">
              <Link href="/">Home</Link><Link href="/menu">Our menu</Link><Link href="/cart">Your cart</Link>
            </div>
          </div>
          <div className="footer-column">
            <h3>Visit us</h3>
            <div className="footer-links">
              <span>Freshly prepared, made with care</span><span>Traditional Ethiopian flavors</span><span>ETB pricing</span>
            </div>
          </div>
        </div>
        <div className="footer-bottom">© {new Date().getFullYear()} Mesob House. Made with care.</div>
      </div>
    </footer>
  );
}
