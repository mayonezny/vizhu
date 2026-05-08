import { type ComponentType } from 'react';
import { Link } from 'react-router';

import './QuickActionButton.scss';

type QuickActionButtonProps = {
  label: string;
  to: string;
  prompt?: string;
  Icon?: ComponentType;
  ariaLabel?: string;
};

export const QuickActionButton = ({
  label,
  to,
  prompt,
  Icon,
  ariaLabel,
}: QuickActionButtonProps) => (
  <Link
    to={to}
    state={prompt ? { prompt } : undefined}
    className="quick-action-btn"
    aria-label={ariaLabel ?? label}
  >
    <span className="quick-action-btn__label">{label}</span>
    {Icon && (
      <span className="quick-action-btn__icon" aria-hidden="true">
        <Icon />
      </span>
    )}
  </Link>
);
