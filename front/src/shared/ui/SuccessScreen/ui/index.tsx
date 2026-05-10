import { Check } from 'lucide-react';

import { Button } from '@/shared/ui/Button';

import './SuccessScreen.scss';

type SuccessScreenProps = {
  userName?: string;
  title: string;
  subtitle?: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export const SuccessScreen = ({
  userName,
  title,
  subtitle,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: SuccessScreenProps) => (
  <main id="main-content" className="success-screen" tabIndex={-1} aria-labelledby="success-title">
    <div className="success-screen__icon" aria-hidden="true">
      <Check size={48} strokeWidth={3} />
    </div>

    <div className="success-screen__content">
      {userName && (
        <p className="success-screen__name" aria-hidden="true">
          {userName.toUpperCase()}
        </p>
      )}
      <h1 id="success-title" className="success-screen__title">
        {title}
      </h1>
      {subtitle && <p className="success-screen__subtitle">{subtitle}</p>}
    </div>

    <div className="success-screen__actions">
      <Button onClick={onPrimary} aria-label={primaryLabel}>
        {primaryLabel}
      </Button>

      {secondaryLabel && onSecondary && (
        <button
          type="button"
          className="success-screen__secondary-btn"
          onClick={onSecondary}
          aria-label={secondaryLabel}
        >
          {secondaryLabel}
        </button>
      )}
    </div>
  </main>
);
