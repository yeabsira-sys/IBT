export default function PromiseBanner({ icon, title, text }) {
  return (
    <div className="promise-banner">
      <span className="promise-banner__icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <h4>{title}</h4>
        <p>{text}</p>
      </div>
    </div>
  );
}
