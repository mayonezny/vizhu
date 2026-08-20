import { create, type StateCreator } from 'zustand';
import { createJSONStorage, devtools, persist, type PersistOptions } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { env } from '@/shared/config';
import { persistStateStorage } from '@/shared/platform';

/**
 * Тип creator-функции при обёртке через immer.
 * `set` принимает колбэк с мутациями черновика — спред не нужен.
 */
type ImmerCreator<T> = StateCreator<T, [['zustand/immer', never]], []>;

// ─── createStore ──────────────────────────────────────────────────────────────

/**
 * Создаёт Zustand-стор с предустановленными **devtools** + **immer**.
 *
 * - `devtools`: интеграция с Redux DevTools — автоматически отключается в проде.
 * - `immer`: пишите мутации в экшенах напрямую, без spread-копирования стейта.
 *
 * @example
 * ```ts
 * const useCounterStore = createStore('Counter', (set) => ({
 *   count: 0,
 *   increment: () => set((draft) => { draft.count += 1 }),
 * }));
 * ```
 */
export function createStore<T extends object>(storeName: string, creator: ImmerCreator<T>) {
  return create<T>()(
    devtools(immer(creator), {
      name: storeName,
      enabled: env.enableDevtools,
    }),
  );
}

// ─── createPersistedStore ─────────────────────────────────────────────────────

/**
 * Аналог `createStore`, но также сохраняет состояние через платформенное
 * хранилище (`platform.stateStorage`: web — localStorage, Capacitor —
 * Preferences). Можно переопределить через `persistOptions.storage`.
 *
 * @example
 * ```ts
 * const useThemeStore = createPersistedStore(
 *   'Theme',
 *   (set) => ({
 *     theme: 'light' as 'light' | 'dark',
 *     toggle: () => set((d) => { d.theme = d.theme === 'light' ? 'dark' : 'light' }),
 *   }),
 *   { name: 'theme-store' },
 * );
 * ```
 */
export function createPersistedStore<T extends object>(
  storeName: string,
  creator: ImmerCreator<T>,
  persistOptions: PersistOptions<T>,
) {
  return create<T>()(
    devtools(
      persist(immer(creator), {
        storage: createJSONStorage<T>(() => persistStateStorage),
        ...persistOptions,
      }),
      {
        name: storeName,
        enabled: env.enableDevtools,
      },
    ),
  );
}
