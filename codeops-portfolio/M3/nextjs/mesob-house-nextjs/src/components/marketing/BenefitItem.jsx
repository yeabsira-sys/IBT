/**
 * BenefitItem — icon + title + description.
 * `featured` lifts the first item onto a white card.
 */
export default function BenefitItem({ icon, title, description, featured = false }) {
  return (
    <li className={`benefit${featured ? " benefit--featured" : ""}`}>
      <span className="benefit__icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <h4 className="benefit__title">{title}</h4>
        <p className="benefit__text">{description}</p>
      </div>
    </li>
  );
}
