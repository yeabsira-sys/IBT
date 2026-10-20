export default function DishLoading() {
  return (
    <div className="container" aria-busy="true" style={{ paddingTop: 32 }}>
      <div className="skeleton skeleton--line" style={{ width: "30%" }} />
      <div className="dish-detail" style={{ marginTop: 16 }}>
        <div className="skeleton" style={{ height: 420 }} />
        <div className="skeleton" style={{ height: 520 }} />
      </div>
    </div>
  );
}
