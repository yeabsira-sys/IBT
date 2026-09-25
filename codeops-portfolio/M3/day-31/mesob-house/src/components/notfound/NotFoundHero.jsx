import { Link } from "react-router-dom";
import { FaBagShopping, FaUtensils } from "react-icons/fa6";
import { FiBookOpen } from "react-icons/fi";
import Button from "../ui/Button";
import { Tag } from "../ui/Primitives";
import MesobIllustration from "./MesobIllustration";

export default function NotFoundHero({ eyebrow, lede, message, actions }) {
  return (
    <section className="notfound-hero">
      <div className="notfound-hero__glow" aria-hidden="true" />

      <figure className="notfound-hero__plate">
        <MesobIllustration />
        <figcaption>
          <Tag tone="dark">Empty Mesob</Tag>
        </figcaption>
      </figure>

      <h1 className="notfound-hero__code">
        404
        <span className="notfound-hero__eyebrow">{eyebrow}</span>
      </h1>

      <p className="notfound-hero__lede">{lede}</p>

      {message && <p className="notfound-hero__message">{message}</p>}

      <div className="notfound-hero__actions">
        <Button
          as={Link}
          to={actions.primary.to}
          variant="primary"
          leftIcon={<FaUtensils />}
        >
          {actions.primary.label}
        </Button>
        <Button
          as={Link}
          to={actions.secondary.to}
          variant="soft"
          leftIcon={<FiBookOpen />}
        >
          {actions.secondary.label}
        </Button>
        <Button
          as={Link}
          to={actions.tertiary.to}
          variant="soft"
          leftIcon={<FaBagShopping />}
        >
          {actions.tertiary.label}
        </Button>
      </div>
    </section>
  );
}
