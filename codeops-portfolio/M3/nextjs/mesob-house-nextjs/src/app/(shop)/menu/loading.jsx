export default function MenuLoading() {
  return (
    <div className="container menu-page" aria-busy="true">
      <div className="skeleton skeleton--title" style={{ marginTop: 32 }} />
      <div className="skeleton skeleton--line" style={{ width: "40%" }} />
      <div className="skeleton-grid">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="skeleton skeleton--card" />
        ))}
      </div>
    </div>
  );
}
