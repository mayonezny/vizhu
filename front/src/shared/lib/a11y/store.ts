import { useShallow } from 'zustand/shallow';

import { createPersistedStore } from '@/shared/lib/zustand';

// ─── Типы ─────────────────────────────────────────────────────────────────────

type TextScale = 1 | 1.25 | 1.5 | 2;

interface A11yState {
  textScale: TextScale;
  highContrast: boolean;
  reduceMotion: boolean;
}

interface A11yActions {
  setTextScale: (scale: TextScale) => void;
  toggleHighContrast: () => void;
  toggleReduceMotion: () => void;
}

type A11yStore = A11yState & A11yActions;

// ─── Стор ─────────────────────────────────────────────────────────────────────

export const useA11yStore = createPersistedStore<A11yStore>(
  'A11y',
  (set) => ({
    textScale: 1,
    highContrast: false,
    reduceMotion: false,

    setTextScale: (scale) =>
      set((draft) => {
        draft.textScale = scale;
      }),
    toggleHighContrast: () =>
      set((draft) => {
        draft.highContrast = !draft.highContrast;
      }),
    toggleReduceMotion: () =>
      set((draft) => {
        draft.reduceMotion = !draft.reduceMotion;
      }),
  }),
  { name: 'a11y-settings' },
);

// ─── Хуки-селекторы ───────────────────────────────────────────────────────────

export const useTextScale = () => useA11yStore((s) => s.textScale);
export const useHighContrast = () => useA11yStore((s) => s.highContrast);
export const useReduceMotion = () => useA11yStore((s) => s.reduceMotion);

export const useA11yActions = () =>
  useA11yStore(
    useShallow((s) => ({
      setTextScale: s.setTextScale,
      toggleHighContrast: s.toggleHighContrast,
      toggleReduceMotion: s.toggleReduceMotion,
    })),
  );
