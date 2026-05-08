export const SlidePremium = () => (
  <svg
    viewBox="0 0 160 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className="ob-slide__svg"
  >
    <circle cx="80" cy="80" r="72" fill="var(--blue-100)" />

    <g className="ob-slide__doc">
      <rect
        x="38"
        y="30"
        width="72"
        height="90"
        rx="10"
        fill="white"
        stroke="var(--color-primary)"
        strokeWidth="4"
      />
    </g>

    <line
      x1="54"
      y1="56"
      x2="94"
      y2="56"
      stroke="var(--blue-300)"
      strokeWidth="4"
      strokeLinecap="round"
      className="ob-slide__line-1"
    />
    <line
      x1="54"
      y1="70"
      x2="94"
      y2="70"
      stroke="var(--blue-300)"
      strokeWidth="4"
      strokeLinecap="round"
      className="ob-slide__line-2"
    />
    <line
      x1="54"
      y1="84"
      x2="78"
      y2="84"
      stroke="var(--blue-300)"
      strokeWidth="4"
      strokeLinecap="round"
      className="ob-slide__line-3"
    />

    <g className="ob-slide__badge-premium">
      <circle cx="108" cy="112" r="20" fill="var(--color-primary)" />
    </g>

    <path
      d="M98 112 L105 119 L118 104"
      stroke="white"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="ob-slide__checkmark"
    />
  </svg>
);
