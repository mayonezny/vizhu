import { useEffect, useState } from 'react';

/**
 * Отслеживает соответствие CSS media query и реагирует на изменения.
 *
 * @example
 * const isMobile = useMediaQuery(breakpoints.md);     // < 768px
 * const isDesktop = useMediaQuery('(min-width: 1024px)');
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * Пресеты брейкпоинтов (mobile-first, min-width).
 *
 * @example
 * const isTablet = useMediaQuery(breakpoints.md);   // >= 768px
 */
export const breakpoints = {
  xs: '(min-width: 480px)',
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
} as const;
