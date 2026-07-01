import { z } from 'zod';

/**
 * Валидация переменных окружения в рантайме.
 * При запуске приложения выбрасывает ошибку, если обязательные переменные
 * отсутствуют или имеют неверный формат.
 * Добавляйте новые переменные сюда по мере роста проекта.
 */
const envSchema = z.object({
  VITE_API_URL: z.string().min(1, 'VITE_API_URL обязателен'),
  // Адрес Socket.IO-сервера матчинга. По умолчанию — тот же origin, что и
  // приложение (в проде фронт и сокет на одном домене за nginx).
  // Пустая строка трактуется как «не задано» → берём origin в рантайме.
  VITE_SOCKET_URL: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  VITE_API_TIMEOUT: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 15_000)),
  VITE_APP_TITLE: z.string().optional().default('Frontend Template'),
  VITE_APP_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
  VITE_ENABLE_DEVTOOLS: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  console.error('❌ Некорректные переменные окружения:\n', parsed.error.format());
  throw new Error('Некорректные переменные окружения. Смотрите .env.example для справки.');
}

export const env = {
  apiUrl: parsed.data.VITE_API_URL,
  /** Socket.IO матчинга. Пусто → берём origin окна в рантайме. */
  socketUrl:
    parsed.data.VITE_SOCKET_URL ?? (typeof window !== 'undefined' ? window.location.origin : ''),
  apiTimeout: parsed.data.VITE_API_TIMEOUT,
  appTitle: parsed.data.VITE_APP_TITLE,
  appEnv: parsed.data.VITE_APP_ENV,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  /** DevTools включены только если VITE_ENABLE_DEVTOOLS=true (или в dev-режиме по умолчанию) */
  enableDevtools: parsed.data.VITE_ENABLE_DEVTOOLS ?? import.meta.env.DEV,
} as const;
