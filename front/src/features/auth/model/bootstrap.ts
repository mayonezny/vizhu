import axios from 'axios';

import { refreshSession } from '@/shared/api';
import { getAccessToken } from '@/shared/api/token-store';

import { useAuthStore } from './auth.store';

/**
 * Восстановление сессии при старте приложения.
 *
 * Access-токен живёт только в памяти и после перезагрузки страницы теряется.
 * Если персист говорит, что пользователь залогинен, — тихо обновляем токен
 * по httpOnly-куке (POST /auth/refresh) ДО первого рендера, чтобы гарды
 * роутера и первые запросы работали с валидным токеном.
 *
 * Разлогиниваем только при явном отказе сервера (401/403). Сетевая ошибка
 * (офлайн-PWA) сессию не рушит: axios-интерсептор повторит refresh при
 * первом же запросе.
 */
export const bootstrapAuth = async (): Promise<void> => {
  const { isAuthed, login, logout } = useAuthStore.getState();
  if (!isAuthed || getAccessToken()) {
    return;
  }

  try {
    const accessToken = await refreshSession();
    login(accessToken);
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (status === 401 || status === 403) {
      logout();
    }
  }
};
