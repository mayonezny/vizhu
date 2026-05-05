import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from '@/shared/api/mocks/server';

// Запускаем MSW-сервер перед всеми тестами
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Сбрасываем хэндлеры после каждого теста (предотвращает утечку между тестами)
afterEach(() => server.resetHandlers());

// Останавливаем сервер после всех тестов
afterAll(() => server.close());
