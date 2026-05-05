import type { ReactNode } from 'react';

import { useTheme } from '@/shared/lib/theme';

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Инициализирует тему при старте приложения:
 * применяет `data-theme` на `<html>` и следит за системными изменениями.
 *
 * Оборачивает корневой узел в `AppProviders`.
 */
export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  useTheme();
  return <>{children}</>;
};
