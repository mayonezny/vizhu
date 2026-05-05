import { useEffect, type ReactNode } from 'react';

import { useHighContrast, useReduceMotion, useTextScale } from '@/shared/lib/a11y';

interface A11yProviderProps {
  children: ReactNode;
}

/**
 * Применяет настройки доступности из a11y-стора на корневой элемент <html>.
 *
 * CSS-переменная --text-scale масштабирует типографику через body { font-size: calc(1rem * var(--text-scale)) }.
 * data-high-contrast и data-reduce-motion — селекторы для переопределения токенов в index.css.
 */
export const A11yProvider = ({ children }: A11yProviderProps) => {
  const textScale = useTextScale();
  const highContrast = useHighContrast();
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--text-scale', String(textScale));
    root.dataset.highContrast = String(highContrast);
    root.dataset.reduceMotion = String(reduceMotion);
  }, [textScale, highContrast, reduceMotion]);

  return <>{children}</>;
};
