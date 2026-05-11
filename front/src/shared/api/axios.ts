import axios, { type InternalAxiosRequestConfig } from 'axios';

import { env } from '@/shared/config';

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
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

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
        const { data } = await api.post<{ accessToken: string }>('/auth/refresh');
        const newToken = data.accessToken;
        setAccessToken(newToken);

        const raw = localStorage.getItem('vizhu-auth');
        if (raw) {
          const parsed = JSON.parse(raw) as { state: Record<string, unknown> };
          parsed.state.accessToken = newToken;
          localStorage.setItem('vizhu-auth', JSON.stringify(parsed));
        }

        drainQueue(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        drainQueue(null);
        setAccessToken(null);
        localStorage.removeItem('vizhu-auth');
        window.location.replace('/auth');
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
