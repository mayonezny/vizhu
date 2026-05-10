import { STORAGE_KEYS } from '@/shared/config/storage-keys';
import { createPersistedStore } from '@/shared/lib/zustand';

interface AuthState {
  isAuthed: boolean;
  phone: string | null;
  userName: string | null;
}

interface AuthActions {
  login: (params?: { phone?: string; userName?: string }) => void;
  logout: () => void;
  setPhone: (phone: string) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = createPersistedStore<AuthStore>(
  'Auth',
  (set) => ({
    isAuthed: false,
    phone: null,
    userName: null,
    login: (params) =>
      set((draft) => {
        draft.isAuthed = true;
        if (params?.phone) {
          draft.phone = params.phone;
        }
        if (params?.userName) {
          draft.userName = params.userName;
        }
      }),
    logout: () =>
      set((draft) => {
        draft.isAuthed = false;
        draft.phone = null;
        draft.userName = null;
      }),
    setPhone: (phone) =>
      set((draft) => {
        draft.phone = phone;
      }),
  }),
  { name: STORAGE_KEYS.AUTH },
);
