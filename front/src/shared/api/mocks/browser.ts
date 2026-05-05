import { setupWorker } from 'msw/browser';

import { handlers } from './handlers';

/**
 * MSW Service Worker — для браузерного мокирования во время разработки.
 *
 * Использование в main.tsx (опционально, для полностью офлайн-режима):
 * ```ts
 * if (import.meta.env.DEV) {
 *   const { worker } = await import('@/shared/api/mocks/browser');
 *   await worker.start({ onUnhandledRequest: 'bypass' });
 * }
 * ```
 *
 * Требует предварительной инициализации: npx msw init public/ --save
 */
export const worker = setupWorker(...handlers);
