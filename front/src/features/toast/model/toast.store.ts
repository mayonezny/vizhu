import { create } from 'zustand';

interface ToastState {
  message: string;
  isOpen: boolean;
  duration: number;
  timerId: NodeJS.Timeout | null;
}

interface ToastActions {
  showToast: (message: string, duration?: number) => void;
  hideToast: () => void;
}

type ToastStore = ToastState & ToastActions;

export const useToastStore = create<ToastStore>((set, get) => ({
  message: '',
  isOpen: false,
  duration: 3000,
  timerId: null,

  showToast: (message, duration = 3000) => {
    const { timerId, hideToast } = get();

    if (timerId) {
      clearTimeout(timerId);
    }

    set({ message, isOpen: true, duration });

    const newTimerId = setTimeout(() => {
      hideToast();
    }, duration);

    set({ timerId: newTimerId });
  },

  hideToast: () => {
    const { timerId } = get();

    if (timerId) {
      clearTimeout(timerId);
    }

    set({ isOpen: false, message: '', timerId: null });
  },
}));
