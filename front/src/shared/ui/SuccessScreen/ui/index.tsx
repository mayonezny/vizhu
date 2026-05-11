import { Button } from '@/shared/ui/Button';
import './SuccessScreen.scss';
import { Logo } from '@/shared/ui/Logo';

type SuccessScreenProps = {
  title: string;
  subtitle?: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export const SuccessScreen = ({
  title,
  subtitle,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: SuccessScreenProps) => (
  <main id="main-content" className="success-screen" tabIndex={-1} aria-labelledby="success-title">
    <Logo className="success-screen__logo" />

    <div className="success-screen__content">
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
