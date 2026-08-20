import { clearStoredRefreshToken } from '@/shared/api/refresh-token-store';
import { setAccessToken } from '@/shared/api/token-store';
import { STORAGE_KEYS } from '@/shared/config/storage-keys';
import { queryClient } from '@/shared/lib/tanstack-query';
import { createPersistedStore } from '@/shared/lib/zustand';

interface AuthState {
  isAuthed: boolean;
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

/**
 * Сессия пользователя.
 *
 * Access-токен НЕ хранится ни в сторе, ни в localStorage — только в памяти
 * (shared/api/token-store): так он недоступен XSS и не протухает в персисте.
 * После перезагрузки страницы токен восстанавливается тихим /auth/refresh
 * по httpOnly-куке (см. ./bootstrap.ts), персистится лишь флаг isAuthed.
 */
export const useAuthStore = createPersistedStore<AuthStore>(
  'Auth',
  (set) => ({
    isAuthed: false,
    phone: null,
    userName: null,
    login: (accessToken) =>
      set((draft) => {
        draft.isAuthed = true;
        setAccessToken(accessToken);
        // Новый аккаунт — чистим кэш, чтобы не показать данные прошлого юзера.
        queryClient.clear();
      }),
    logout: () =>
      set((draft) => {
        draft.isAuthed = false;
        draft.phone = null;
        draft.userName = null;
        setAccessToken(null);
        // Натив: refresh-токен из защищённого хранилища тоже удаляем.
        void clearStoredRefreshToken();
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
  },
);
