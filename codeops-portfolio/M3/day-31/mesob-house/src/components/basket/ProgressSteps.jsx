import { FiCheck } from "react-icons/fi";

export default function ProgressSteps({ steps, current = 1 }) {
  return (
    <ol className="progress-steps">
      {steps.map((step, i) => {
        const n = i + 1;
        const state =
          n === current ? "current" : n < current ? "done" : "upcoming";
        return (
          <li
            key={step}
            className={`progress-steps__item progress-steps__item--${state}`}
          >
            <span className="progress-steps__num">
              {state === "done" ? <FiCheck /> : n}
            </span>
            {step}
          </li>
        );
      })}
    </ol>
  );
}
