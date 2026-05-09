import { STORAGE_KEYS } from '@/shared/config/storage-keys';
import { createPersistedStore } from '@/shared/lib/zustand';

interface AuthState {
  isAuthed: boolean;
}

interface AuthActions {
  login: () => void;
  logout: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = createPersistedStore<AuthStore>(
  'Auth',
  (set) => ({
    isAuthed: false,
    login: () =>
      set((draft) => {
        draft.isAuthed = true;
      }),
    logout: () =>
      set((draft) => {
        draft.isAuthed = false;
      }),
  }),
  { name: STORAGE_KEYS.AUTH },
);
