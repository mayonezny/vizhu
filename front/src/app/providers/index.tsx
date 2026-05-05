import type { ReactNode } from 'react';
import { Toaster } from 'sonner';

import { QueryProvider } from './QueryProvider';
import { ThemeProvider } from './ThemeProvider';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Корневая композиция провайдеров.
 * Добавляйте новые глобальные провайдеры здесь (auth, theme, i18n и т.д.)
 * — в нужном порядке вложенности.
 */
export const AppProviders = ({ children }: AppProvidersProps) => (
  <ThemeProvider>
    <QueryProvider>
      {children}
      {/* Контейнер toast-уведомлений — sonner */}
      <Toaster richColors position="bottom-right" />
    </QueryProvider>
  </ThemeProvider>
);
