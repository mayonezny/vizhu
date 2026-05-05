import { useShallow } from 'zustand/shallow';

import { createStore } from '@/shared/lib/zustand';

// ─── Типы ─────────────────────────────────────────────────────────────────────

interface CounterState {
  count: number;
  /** Шаг увеличения/уменьшения */
  step: number;
}

interface CounterActions {
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  setStep: (step: number) => void;
}

type CounterStore = CounterState & CounterActions;

// ─── Стор ─────────────────────────────────────────────────────────────────────

export const useCounterStore = createStore<CounterStore>('Counter', (set) => ({
  count: 0,
  step: 1,
  // immer позволяет мутировать черновик напрямую — спред не нужен
  increment: () =>
    set((draft) => {
      draft.count += draft.step;
    }),
  decrement: () =>
    set((draft) => {
      draft.count -= draft.step;
    }),
  reset: () =>
    set((draft) => {
      draft.count = 0;
    }),
  setStep: (step) =>
    set((draft) => {
      draft.step = Math.max(1, step);
    }),
}));

// ─── Хуки-селекторы ───────────────────────────────────────────────────────────
//
// Подписывайтесь только на нужный срез — компонент ре-рендерится
// только при изменении своего значения.
// Предпочтительнее, чем деструктуризация всего стора на месте вызова.
//

/** Возвращает текущее значение счётчика. Ре-рендер только при изменении count. */
export const useCount = () => useCounterStore((s) => s.count);

/** Возвращает текущий шаг. Ре-рендер только при изменении step. */
export const useCounterStep = () => useCounterStore((s) => s.step);

/**
 * Возвращает все экшены как стабильный объект.
 * `useShallow` предотвращает ре-рендеры при пересоздании ссылок на экшены
 * (в Zustand экшены стабильны, но паттерн полезен для объектных селекторов).
 */
export const useCounterActions = () =>
  useCounterStore(
    useShallow((s) => ({
      increment: s.increment,
      decrement: s.decrement,
      reset: s.reset,
      setStep: s.setStep,
    })),
  );
