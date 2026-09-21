import { FiCheck } from "react-icons/fi";

export default function OrderSteps({ steps, current = 1 }) {
  return (
    <ol className="order-steps">
      {steps.map((step, i) => {
        const n = i + 1;
        const state =
          n === current ? "current" : n < current ? "done" : "upcoming";
        return (
          <li
            key={step}
            className={`order-steps__item order-steps__item--${state}`}
          >
            <span className="order-steps__circle">
              {state === "done" ? <FiCheck /> : n}
            </span>
            <span className="order-steps__label">
              <small>Step {n}</small>
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
