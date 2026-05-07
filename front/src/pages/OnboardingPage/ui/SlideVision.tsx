export const SlideVision = () => (
  <svg
    viewBox="0 0 160 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className="ob-slide__svg"
  >
    <circle cx="80" cy="80" r="72" fill="var(--blue-100)" />

    <path
      d="M20 80 C40 44 120 44 140 80 C120 116 40 116 20 80Z"
      fill="white"
      stroke="var(--color-primary)"
      strokeWidth="4"
    />

    <circle cx="80" cy="80" r="22" fill="var(--color-primary)" />

    <circle cx="80" cy="80" r="10" fill="white" />
    <circle cx="80" cy="80" r="5" fill="var(--color-primary)" />

    <circle cx="87" cy="74" r="3" fill="white" opacity="0.7" />

    <line
      x1="24"
      y1="80"
      x2="136"
      y2="80"
      stroke="var(--color-primary)"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.5"
      className="ob-slide__scan-line"
    />

    <path
      d="M36 56 L36 48 L44 48"
      stroke="var(--color-primary)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M124 56 L124 48 L116 48"
      stroke="var(--color-primary)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M36 104 L36 112 L44 112"
      stroke="var(--color-primary)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M124 104 L124 112 L116 112"
      stroke="var(--color-primary)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
