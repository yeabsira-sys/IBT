import { Badge, Card } from "../ui/Surface";
import BenefitItem from "./BenefitItem";
import TestimonialCard from "./TestimonialCard";

/**
 * MembershipPanel — the value-proposition column beside the sign-up form.
 * Feed it `benefits` (first one renders featured) and an optional testimonial.
 */
export default function MembershipPanel({
  badge,
  title,
  lede,
  benefits = [],
  testimonial,
}) {
  return (
    <Card variant="panel" className="membership">
      {badge && <div><Badge>{badge}</Badge></div>}

      <div>
        <h1 className="membership__title">{title}</h1>
        <p className="membership__lede" style={{ marginTop: 14 }}>
          {lede}
        </p>
      </div>

      <ul className="benefits">
        {benefits.map((benefit, index) => (
          <BenefitItem key={benefit.title} featured={index === 0} {...benefit} />
        ))}
      </ul>

      {testimonial && <TestimonialCard {...testimonial} />}
    </Card>
  );
}
