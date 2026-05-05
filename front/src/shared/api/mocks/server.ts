import { setupServer } from 'msw/node';

import { handlers } from './handlers';

/**
 * MSW Node-сервер — используется в тестах Vitest.
 * Запускается и останавливается автоматически через src/tests/setup.ts.
 */
export const server = setupServer(...handlers);
