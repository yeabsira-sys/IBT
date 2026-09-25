import { Badge, Card } from "../ui/Surface";
import BenefitItem from "../marketing/BenefitItem";

function FeatureImage({ image, alt, title, note, icon }) {
  return (
    <figure className="feature-image">
      <img src={image} alt={alt} />
      <figcaption>
        <span>
          <b>{title}</b>
          <small>{note}</small>
        </span>
        {icon && <span className="feature-image__icon">{icon}</span>}
      </figcaption>
    </figure>
  );
}

function MemberQuote({ mark, quote, source }) {
  return (
    <div className="member-quote">
      <span className="member-quote__mark" aria-hidden="true">
        {mark}
      </span>
      <div>
        <p className="member-quote__text">“{quote}”</p>
        <p className="member-quote__source">{source}</p>
      </div>
    </div>
  );
}

/**
 * AuthPanel — the sign-in page's left column: badge, headline, lede,
 * feature image, perk list and member quote.
 */
export default function AuthPanel({
  badge,
  title,
  lede,
  image,
  perks = [],
  quote,
}) {
  return (
    <Card variant="panel" className="auth-panel">
      {badge && (
        <div>
          <Badge>{badge}</Badge>
        </div>
      )}

      <div>
        <h1 className="auth-panel__title">{title}</h1>
        <p className="auth-panel__lede">{lede}</p>
      </div>

      {image && <FeatureImage {...image} />}

      <ul className="benefits auth-panel__perks">
        {perks.map((perk) => (
          <BenefitItem key={perk.title} {...perk} />
        ))}
      </ul>

      {quote && <MemberQuote {...quote} />}
    </Card>
  );
}
