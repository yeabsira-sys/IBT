import { Link } from "react-router-dom";
import Button from "../ui/Button";
import { Badge } from "../ui/Surface";
import { FiArrowRight } from "react-icons/fi";
import { FaMugHot, FaPepperHot } from "react-icons/fa6";

/** HeroStat — a single figure + caption in the hero's proof row. */
export function HeroStat({ figure, caption }) {
  return (
    <div className="hero__stat">
      <span className="hero__stat-figure">{figure}</span>
      <span className="hero__stat-caption">{caption}</span>
    </div>
  );
}

/**
 * Hero — headline, actions, stat row and the plated image with its two cards.
 */
export default function Hero({
  badge,
  title,
  titleAccent,
  lede,
  primaryAction,
  secondaryAction,
  ceremonyNote,
  stats = [],
  image,
  imageAlt = "",
  imageNote,
  featured,
}) {
  return (
    <section className="hero">
      <div className="hero__copy">
        {badge && <Badge>{badge}</Badge>}

        <h1 className="hero__title">
          {title}
          {titleAccent && (
            <>
              <br />
              <em>{titleAccent}</em>
            </>
          )}
        </h1>

        <p className="hero__lede">{lede}</p>

        <div className="hero__actions">
          {primaryAction && (
            <Button
              as={primaryAction.to ? Link : "button"}
              to={primaryAction.to}
              variant="primary"
              rightIcon={<FiArrowRight />}
              onClick={primaryAction.onClick}
            >
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              as={secondaryAction.to ? Link : "button"}
              to={secondaryAction.to}
              variant="outline"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
          {ceremonyNote && (
            <span className="hero__ceremony">
              <FaMugHot aria-hidden="true" />
              {ceremonyNote}
            </span>
          )}
        </div>

        <div className="hero__stats">
          {stats.map((stat) => (
            <HeroStat key={stat.caption} {...stat} />
          ))}
        </div>
      </div>

      <figure className="hero__media">
        <img src={image} alt={imageAlt} className="hero__image" />

        {imageNote && (
          <div className="hero__float">
            <span className="hero__float-icon" aria-hidden="true">
              <FaPepperHot />
            </span>
            <span>
              <b>{imageNote.title}</b>
              <small>{imageNote.text}</small>
            </span>
          </div>
        )}

        {featured && (
          <figcaption className="hero__featured">
            <span>
              <small>{featured.label}</small>
              <b>{featured.name}</b>
            </span>
            <span className="hero__featured-price">
              {featured.currency} {featured.price}
            </span>
          </figcaption>
        )}
      </figure>
    </section>
  );
}
