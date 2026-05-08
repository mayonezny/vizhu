import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import './RoundButton.scss';

type AriaLabel =
  | { 'aria-label': string; 'aria-labelledby'?: never }
  | { 'aria-label'?: never; 'aria-labelledby': string };

type RoundButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  AriaLabel & {
    icon: ReactNode;
    variant?: 'base' | 'filled';
  };

export const RoundButton = ({
  icon,
  variant = 'base',
  className,
  type = 'button',
  ...props
}: RoundButtonProps) => {
  const buttonClassName = [
    'round-button',
    variant === 'filled' && 'round-button--filled',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={buttonClassName} {...props}>
      <span aria-hidden="true">{icon}</span>
    </button>
  );
};
