import { setAccessToken } from '@/shared/api/token-store';
import { STORAGE_KEYS } from '@/shared/config/storage-keys';
import { queryClient } from '@/shared/lib/tanstack-query';
import { createPersistedStore } from '@/shared/lib/zustand';

interface AuthState {
  isAuthed: boolean;
  accessToken: string | null;
  phone: string | null;
  userName: string | null;
}

interface AuthActions {
  login: (accessToken: string) => void;
  logout: () => void;
  setPhone: (phone: string) => void;
  setUserName: (name: string) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = createPersistedStore<AuthStore>(
  'Auth',
  (set) => ({
    isAuthed: false,
    accessToken: null,
    phone: null,
    userName: null,
    login: (accessToken) =>
      set((draft) => {
        draft.isAuthed = true;
        draft.accessToken = accessToken;
        setAccessToken(accessToken);
        // Новый аккаунт — чистим кэш, чтобы не показать данные прошлого юзера.
        queryClient.clear();
      }),
    logout: () =>
      set((draft) => {
        draft.isAuthed = false;
        draft.accessToken = null;
        draft.phone = null;
        draft.userName = null;
        setAccessToken(null);
        // Сбрасываем весь кэш запросов (профиль и пр.) при выходе.
        queryClient.clear();
      }),
    setPhone: (phone) =>
      set((draft) => {
        draft.phone = phone;
      }),
    setUserName: (name) =>
      set((draft) => {
        draft.userName = name;
      }),
  }),
  {
    name: STORAGE_KEYS.AUTH,
    onRehydrateStorage: () => (state) => {
      if (state?.accessToken) {
        setAccessToken(state.accessToken);
      }
    },
  },
);
