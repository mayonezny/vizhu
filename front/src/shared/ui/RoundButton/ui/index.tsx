import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import './RoundButton.scss';

type AriaLabel =
  | { 'aria-label': string; 'aria-labelledby'?: never }
  | { 'aria-label'?: never; 'aria-labelledby': string };

type RoundButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  AriaLabel & {
    icon: ReactNode;
    variant?: 'base' | 'filled';
    disabled?: boolean;
  };

export const RoundButton = ({
  icon,
  variant = 'base',
  className,
  type = 'button',
  disabled = false,
  ...props
}: RoundButtonProps) => {
  const buttonClassName = [
    'round-button',
    variant === 'filled' && 'round-button--filled',
    disabled && 'round-button--disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={buttonClassName}
      disabled={disabled}
      aria-disabled={disabled}
      {...props}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
};
