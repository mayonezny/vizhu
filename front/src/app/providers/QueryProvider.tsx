import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ReactNode } from 'react';

import { env } from '@/shared/config';
import { queryClient } from '@/shared/lib/tanstack-query';

interface QueryProviderProps {
  children: ReactNode;
}

export const QueryProvider = ({ children }: QueryProviderProps) => (
  <QueryClientProvider client={queryClient}>
    {children}
    {/* Панель DevTools (правый нижний угол) — рендерится только в dev-сборках */}
    {env.enableDevtools && <ReactQueryDevtools initialIsOpen={false} />}
  </QueryClientProvider>
);
