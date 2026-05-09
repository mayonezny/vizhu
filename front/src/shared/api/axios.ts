import axios from 'axios';

import { env } from '@/shared/config';

export const api = axios.create({
  baseURL: env.apiUrl,
  timeout: env.apiTimeout,
  withCredentials: true,
  // Content-Type не задаём явно — axios выставляет его сам:
  // plain object → application/json
  // FormData    → multipart/form-data; boundary=... (boundary проставляет браузер)
});

// ─── Request-интерсептор ──────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) =>
    // Добавьте auth-токен здесь (замените на свою логику авторизации)
    // const token = getAuthToken();
    // if (token) config.headers.Authorization = `Bearer ${token}`;
    config,
  (error: unknown) => Promise.reject(error),
);

// ─── Response-интерсептор ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      // Глобальная обработка ошибок по статус-коду
      if (status === 401) {
        // Обработка неавторизованного доступа (например, редирект на логин)
        console.warn('Unauthorized — редирект на логин');
      }

      if (status === 403) {
        console.warn('Forbidden');
      }

      if (status && status >= 500) {
        console.error('Server error', status);
      }
    }

    return Promise.reject(error);
  },
);
