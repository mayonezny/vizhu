import { useEffect } from 'react';

import { createPersistedStore } from '@/shared/lib/zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

export const useThemeStore = createPersistedStore<ThemeState>(
  'Theme',
  (set) => ({
    mode: 'system',
    setMode: (mode) =>
      set((draft) => {
        draft.mode = mode;
      }),
    toggle: () =>
      set((draft) => {
        draft.mode = draft.mode === 'dark' ? 'light' : 'dark';
      }),
  }),
  { name: 'theme-store' },
);

function getResolvedTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') {
    return mode;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', getResolvedTheme(mode));
}

/**
 * Управление темой приложения.
 *
 * - `mode` — выбранный режим: `'light'`, `'dark'`, или `'system'` (по умолчанию).
 * - `resolvedTheme` — фактическая тема (`'light'` | `'dark'`), с учётом системной.
 * - `setMode` — установить конкретный режим.
 * - `toggle` — переключить между `light` и `dark`.
 *
 * Применяет `data-theme` на `<html>` и отслеживает системные изменения при `mode === 'system'`.
 *
 * @example
 * const { resolvedTheme, toggle } = useTheme();
 */
export function useTheme() {
  const { mode, setMode, toggle } = useThemeStore();

  // Применяем тему при изменении mode
  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  // Следим за системной темой, если выбран режим 'system'
  useEffect(() => {
    if (mode !== 'system') {
      return;
    }

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    };

    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  return {
    mode,
    resolvedTheme: getResolvedTheme(mode),
    setMode,
    toggle,
  };
}
