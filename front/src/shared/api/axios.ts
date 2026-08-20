import axios, { type InternalAxiosRequestConfig } from 'axios';

import { env } from '@/shared/config';
import { STORAGE_KEYS } from '@/shared/config/storage-keys';
import { isNativePlatform, platform } from '@/shared/platform';

import {
  clearStoredRefreshToken,
  getStoredRefreshToken,
  storeRefreshToken,
} from './refresh-token-store';
import { getAccessToken, setAccessToken } from './token-store';

export const api = axios.create({
  baseURL: env.apiUrl,
  timeout: env.apiTimeout,
  withCredentials: true,
});

let isRefreshing = false;
let waitQueue: Array<(token: string | null) => void> = [];

const drainQueue = (token: string | null) => {
  waitQueue.forEach((cb) => cb(token));
  waitQueue = [];
};

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Нативный клиент (Capacitor): бэкенд отдаёт refresh-токен в теле,
    // а не в куке (см. refresh-token-store.ts).
    if (isNativePlatform()) {
      config.headers['X-Client'] = 'native';
    }
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

/**
 * Обновить access-токен. Web — по httpOnly-куке; натив — по refresh-токену
 * из защищённого хранилища (с ротацией: новый токен из ответа сохраняем).
 * Используется интерсептором 401 и бутстрапом сессии.
 */
export const refreshSession = async (): Promise<string> => {
  let body: { refreshToken: string } | undefined;
  if (isNativePlatform()) {
    const stored = await getStoredRefreshToken();
    if (!stored) {
      console.warn('[auth] refresh: в защищённом хранилище нет refresh-токена');
    }
    body = { refreshToken: stored ?? '' };
  }
  const { data } = await api.post<{ accessToken: string; refreshToken?: string }>(
    '/auth/refresh',
    body,
  );
  // Сначала — долговременная запись нового refresh-токена (ротация!),
  // и только потом всё остальное: чем меньше окно между ответом сервера
  // и сохранением, тем меньше шанс потерять сессию при убийстве приложения.
  if (data.refreshToken) {
    await storeRefreshToken(data.refreshToken);
  }
  // Access-токен живёт только в памяти — в персист ничего писать не нужно.
  setAccessToken(data.accessToken);
  return data.accessToken;
};

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const isRefreshEndpoint = originalRequest?.url?.includes('/auth/refresh');
    if (status === 401 && originalRequest && !originalRequest._retry && !isRefreshEndpoint) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          waitQueue.push((token) => {
            if (!token) {
              reject(error);
              return;
            }
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;
      try {
        const newToken = await refreshSession();

        drainQueue(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        drainQueue(null);
        setAccessToken(null);
        // Сессия умерла: чистим refresh-токен и персист авторизации
        // (на нативе — асинхронно, поэтому редирект после завершения).
        void Promise.allSettled([
          clearStoredRefreshToken(),
          Promise.resolve(platform.stateStorage.removeItem(STORAGE_KEYS.AUTH)),
        ]).then(() => {
          window.location.replace('/auth');
        });
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (status === 403) {
      console.warn('Forbidden');
    }
    if (status && status >= 500) {
      console.error('Server error', status);
    }

    return Promise.reject(error);
  },
);
