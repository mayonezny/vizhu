export const SlideVolunteer = () => (
  <svg
    viewBox="0 0 160 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className="ob-slide__svg"
  >
    <circle cx="80" cy="80" r="72" fill="var(--blue-100)" />

    <rect
      x="34"
      y="34"
      width="92"
      height="92"
      rx="20"
      fill="white"
      stroke="var(--color-primary)"
      strokeWidth="4"
      className="ob-slide__card-border"
    />

    <g className="ob-slide__person">
      <circle cx="80" cy="68" r="16" fill="var(--color-primary)" />
      <path d="M50 112 C50 94 62 86 80 86 C98 86 110 94 110 112" fill="var(--color-primary)" />
    </g>

    <g className="ob-slide__badge-volunteer">
      <circle cx="116" cy="42" r="13" fill="#ef4444" />
      <text x="116" y="47" textAnchor="middle" fill="white" fontSize="14" fontWeight="700">
        !
      </text>
    </g>
  </svg>
);
