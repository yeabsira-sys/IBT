export default function MesobIllustration({ size = 88 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g
        style={{ stroke: "var(--c-gold)" }}
        strokeWidth="3"
        strokeLinecap="round"
      >
        <path d="M46 30c-3-6-3-12 2-17" opacity="0.7" />
        <path d="M60 28c-3-7-3-13 2-18" opacity="0.85" />
        <path d="M74 30c-3-6-3-12 2-17" opacity="0.7" />
      </g>
      <ellipse
        cx="60"
        cy="94"
        rx="38"
        ry="9"
        style={{ fill: "var(--c-panel-2)" }}
      />
      <ellipse
        cx="60"
        cy="91"
        rx="30"
        ry="6"
        style={{ fill: "var(--c-surface)" }}
      />
      <path
        d="M60 40 C40 40 25 56 22 74 L98 74 C95 56 80 40 60 40Z"
        style={{ fill: "var(--c-brand)" }}
      />
      <path
        d="M60 40 C40 40 25 56 22 74 L98 74 C95 56 80 40 60 40Z"
        style={{ fill: "none", stroke: "var(--c-brand-deep, var(--c-brand))" }}
        strokeWidth="1.5"
        opacity="0.4"
      />
      <circle cx="60" cy="40" r="4" style={{ fill: "var(--c-gold)" }} />
    </svg>
  );
}
