import { setAccessToken } from '@/shared/api/token-store';
import { STORAGE_KEYS } from '@/shared/config/storage-keys';
import { createPersistedStore } from '@/shared/lib/zustand';

interface AuthState {
  isAuthed: boolean;
  accessToken: string | null;
  phone: string | null;
  userName: string | null;
  favoriteContactName: string | null;
  favoriteContactPhone: string | null;
}

interface AuthActions {
  login: (accessToken: string) => void;
  logout: () => void;
  setPhone: (phone: string) => void;
  setUserName: (name: string) => void;
  setFavoriteContact: (name: string, phone: string) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = createPersistedStore<AuthStore>(
  'Auth',
  (set) => ({
    isAuthed: false,
    accessToken: null,
    phone: null,
    userName: null,
    favoriteContactName: null,
    favoriteContactPhone: null,
    login: (accessToken) =>
      set((draft) => {
        draft.isAuthed = true;
        draft.accessToken = accessToken;
        setAccessToken(accessToken);
      }),
    logout: () =>
      set((draft) => {
        draft.isAuthed = false;
        draft.accessToken = null;
        draft.phone = null;
        draft.userName = null;
        setAccessToken(null);
      }),
    setPhone: (phone) =>
      set((draft) => {
        draft.phone = phone;
      }),
    setUserName: (name) =>
      set((draft) => {
        draft.userName = name;
      }),
    setFavoriteContact: (name, phone) =>
      set((draft) => {
        draft.favoriteContactName = name;
        draft.favoriteContactPhone = phone;
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
