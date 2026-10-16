import Link from "next/link";
import SpecialsSection from "@/components/SpecialSection";

export default function HomePage() {
  // const featured = dishes.filter((dish) => dish.popular).slice(0, 3);
  // const { data, error, isLoading } = useSpecials();
  // const featured = Array.isArray(data) ? data : (data?.data ?? []);
  return (
    <main>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">A taste of Ethiopia</span>
            <h1>
              Gather around.
              <br />
              <em>Eat with heart.</em>
            </h1>
            <p>
              From rich, slow-cooked stews to the aroma of freshly brewed buna,
              discover the flavors that make every meal feel like home.
            </p>
            <div className="hero-actions">
              <Link href="/menu" className="btn">
                Explore our menu <span aria-hidden="true">→</span>
              </Link>
              <a href="#favorites" className="btn btn-secondary">
                Today’s favorites
              </a>
            </div>
            <div className="trust-row">
              <span>Freshly prepared</span>
              <span>Authentic flavors</span>
              <span>ETB pricing</span>
            </div>
          </div>
          <div className="hero-art">
            <img
              src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=90"
              alt="A colorful meal prepared with fresh ingredients"
            />
            <div className="hero-badge">
              <strong>Made with care</strong>
              <span>Tradition in every bite</span>
            </div>
          </div>
        </div>
      </section>
      <div className="promo-strip">
        Good food brings us together. <strong>Come hungry, leave happy.</strong>
      </div>
      <section className="section" id="favorites">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Picked for you</span>
              <h2>House favorites</h2>
              <p>Beloved classics, prepared the Mesob House way.</p>
            </div>
            <Link href="/menu" className="btn btn-secondary">
              View full menu →
            </Link>
          </div>
          {/* <div className="dish-grid">
            {featured.map((dish) => (
              <DishCard key={dish.id} dish={dish} />
            ))}
          </div> */}
          <SpecialsSection />
        </div>
      </section>
      <section className="section" style={{ background: "var(--c-panel-2)" }}>
        <div className="container text-center">
          <span className="eyebrow">The Mesob experience</span>
          <h2>More than a meal.</h2>
          <p
            style={{
              maxWidth: 650,
              margin: "18px auto 25px",
              color: "var(--c-ink-soft)",
            }}
          >
            Share a platter, slow down over coffee, and enjoy the comfort of
            Ethiopian hospitality.
          </p>
          <Link href="/menu" className="btn btn-green">
            Find your next favorite
          </Link>
        </div>
      </section>
    </main>
  );
}
