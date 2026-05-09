import { createStore } from '@/shared/lib/zustand';

interface CounterState {
  count: number;
}

interface CounterActions {
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

export const useCounterStore = createStore<CounterState & CounterActions>('Counter', (set) => ({
  count: 0,
  increment: () =>
    set((draft) => {
      draft.count += 1;
    }),
  decrement: () =>
    set((draft) => {
      draft.count -= 1;
    }),
  reset: () =>
    set((draft) => {
      draft.count = 0;
    }),
}));
