import { type ComponentType } from 'react';
import { Link } from 'react-router';

import './QuickActionButton.scss';

type QuickActionButtonProps = {
  label: string;
  prompt: string;
  Icon?: ComponentType;
  ariaLabel?: string;
};

export const QuickActionButton = ({ label, prompt, Icon, ariaLabel }: QuickActionButtonProps) => (
  <Link
    to="/dialog"
    state={{ prompt }}
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
