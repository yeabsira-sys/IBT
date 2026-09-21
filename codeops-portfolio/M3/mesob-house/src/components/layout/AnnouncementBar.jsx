import { FaLeaf } from "react-icons/fa6";
import { FiArrowRight } from "react-icons/fi";

/**
 * AnnouncementBar — the green strip under the navbar.
 * Props: icon, message, note, action {label, href}.
 */
export default function AnnouncementBar({
  icon = <FaLeaf />,
  message,
  note,
  action,
}) {
  return (
    <div className="announce">
      <div className="container announce__inner">
        <p className="announce__message">
          <span className="announce__icon" aria-hidden="true">
            {icon}
          </span>
          {message}
        </p>
        <div className="announce__meta">
          {note && <span className="announce__note">{note}</span>}
          {action && (
            <a className="announce__link" href={action.href}>
              {action.label}
              <FiArrowRight aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
