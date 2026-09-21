import { Link } from "react-router-dom";
import Button from "../ui/Button";

/**
 * CtaBanner
 * Pass any number of actions; the first renders in gold.
 */
export default function CtaBanner({ eyebrow, title, text, actions = [] }) {
  return (
    <section className="cta-wrap">
      <div className="container">
        <div className="cta">
          <div className="cta__copy">
            {eyebrow && <p className="cta__eyebrow">{eyebrow}</p>}
            <h2 className="cta__title">{title}</h2>
            {text && <p className="cta__text">{text}</p>}
          </div>
          <div className="cta__actions">
            {actions.map((action, i) => (
              <Button
                key={action.label}
                as={action.to ? Link : "button"}
                to={action.to}
                variant={i === 0 ? "gold" : "light"}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
