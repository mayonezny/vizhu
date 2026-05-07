import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import './Button.scss';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  /** Надпись над основным текстом (читается screen reader-ом первой) */
  title?: string;
  /** Пояснение под основным текстом */
  subtitle?: string;
  primary?: boolean;
  outline?: boolean;
  danger?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  spread?: boolean;
};

export const Button = ({
  children,
  title,
  subtitle,
  primary = false,
  outline = false,
  danger = false,
  icon,
  iconPosition = 'right',
  spread = false,
  className,
  type = 'button',
  ...props
}: ButtonProps) => {
  const cls = [
    'btn',
    primary && 'btn--primary',
    outline && 'btn--outline',
    danger && 'btn--danger',
    icon && iconPosition === 'left' && 'btn--icon-left',
    icon && iconPosition === 'right' && 'btn--icon-right',
    spread && 'btn--spread',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={cls} {...props}>
      {icon && iconPosition === 'left' && (
        <span className="btn__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="btn__content">
        {title && <span className="btn__title">{title}</span>}
        <span className="btn__label">{children}</span>
        {subtitle && <span className="btn__subtitle">{subtitle}</span>}
      </span>
      {icon && iconPosition === 'right' && (
        <span className="btn__icon" aria-hidden="true">
          {icon}
        </span>
      )}
    </button>
  );
};
