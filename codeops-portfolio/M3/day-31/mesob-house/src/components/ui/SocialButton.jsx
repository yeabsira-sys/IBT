import { FiArrowRight } from "react-icons/fi";

export default function SocialButton({ logo, label, sub, onClick, ...rest }) {
  return (
    <button type="button" className="social-btn" onClick={onClick} {...rest}>
      <span className="social-btn__logo" aria-hidden="true">
        {logo}
      </span>
      <span className="social-btn__text">
        <b>{label}</b>
        {sub && <small>{sub}</small>}
      </span>
      {sub && <FiArrowRight className="social-btn__arrow" aria-hidden="true" />}
    </button>
  );
}
