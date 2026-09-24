import { FaPhone } from "react-icons/fa6";
import Button from "../ui/Button";

/** ConciergeBanner — phone support + reservation prompt for a lost guest. */
export default function ConciergeBanner({ icon, title, text, phone, reserveLabel, onReserve }) {
  return (
    <div className="concierge-banner">
      <span className="concierge-banner__icon" aria-hidden="true">
        {icon}
      </span>
      <div className="concierge-banner__body">
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <div className="concierge-banner__actions">
        <a className="btn btn--light btn--sm" href={`tel:${phone.replace(/\s+/g, "")}`}>
          <FaPhone aria-hidden="true" /> {phone}
        </a>
        <Button size="sm" variant="dark" onClick={onReserve}>
          {reserveLabel}
        </Button>
      </div>
    </div>
  );
}
