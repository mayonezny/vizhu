import react from '@vitejs/plugin-react-swc';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      // Зеркалим пути из tsconfig.app.json
      '@': resolve(__dirname, './src'),
    },
  },

  test: {
    // jsdom эмулирует браузерное окружение для компонентных тестов
    environment: 'jsdom',

    // Setup-файл запускается перед каждым тест-файлом (jest-dom матчеры + MSW-сервер)
    setupFiles: ['./src/tests/setup.ts'],

    // Глобалы Vitest (describe, it, expect и т.д.) доступны без импортов
    globals: true,

    // Обрабатываем CSS-модули и SCSS (предотвращает ошибки импорта)
    css: true,

    // Покрытие кода
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/tests/**',
        'src/**/*.d.ts',
        'src/**/__tests__/**',
        'src/app/main.tsx',
        'src/shared/api/mocks/**',
        'src/vite-env.d.ts',
      ],
    },
  },
});
