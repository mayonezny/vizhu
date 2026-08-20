// eslint.config.js
import js from '@eslint/js';
import tanstackQuery from '@tanstack/eslint-plugin-query';
import importPlugin from 'eslint-plugin-import';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  // ─── Базовые рекомендации ─────────────────────────────────────────────────
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // ─── Правила TanStack Query ───────────────────────────────────────────────
  // Ловит частые ошибки: отсутствующий queryKey, устаревшие замыкания в queryFn и т.д.
  ...tanstackQuery.configs['flat/recommended'],

  // ─── Prettier (должен быть последним, чтобы переопределить правила форматирования) ───
  prettierRecommended,

  // ─── Основной слой правил ─────────────────────────────────────────────────
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
        project: './tsconfig.eslint.json',
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
      import: importPlugin,
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },
    rules: {
      // ─── Общее качество кода ───────────────────────────────────────────
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-implicit-coercion': 'warn',
      curly: ['error', 'all'],
      'no-fallthrough': 'error',
      'no-multi-spaces': 'warn',
      'no-trailing-spaces': 'warn',
      'eol-last': ['error', 'always'],
      'object-shorthand': ['warn', 'always'],
      'prefer-template': 'warn',
      'arrow-body-style': ['warn', 'as-needed'],
      'prefer-arrow-callback': 'warn',

      // ─── TypeScript ──────────────────────────────────────────────────────
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Принудительный `import type` для type-only импортов — меньший бандл
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // Ловит необработанные отклонения промисов
      '@typescript-eslint/no-floating-promises': 'error',
      // Разрешает приведение через `as`, но флагирует двойное приведение
      '@typescript-eslint/no-explicit-any': 'warn',

      // ─── React ───────────────────────────────────────────────────────────
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      'react/jsx-key': 'error',
      'react/self-closing-comp': 'warn',
      'react/jsx-no-duplicate-props': 'error',
      'react/prop-types': 'off', // TypeScript сам следит за типами пропсов
      'react/display-name': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Vite HMR: из .tsx-файлов следует экспортировать только компоненты
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // ─── Импорты ─────────────────────────────────────────────────────────
      'import/extensions': [
        'error',
        'ignorePackages',
        { ts: 'never', tsx: 'never', js: 'never', jsx: 'never' },
      ],
      'import/order': [
        'warn',
        {
          groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      // virtual:* — виртуальные модули Vite-плагинов (virtual:pwa-register)
      'import/no-unresolved': ['error', { ignore: ['^virtual:'] }],
      'import/no-duplicates': 'error',
      'import/newline-after-import': 'warn',
    },
  },

  // ─── Конфигурационные файлы (Node.js-контекст) ──────────────────────────────
  // Отдельный блок с tsconfig.node.json — у них нет DOM, зато есть Node-глобалы.
  {
    files: ['vite.config.ts', 'vitest.config.ts', 'playwright.config.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
      parserOptions: {
        project: './tsconfig.node.json',
      },
    },
  },

  // ─── Переопределения для тестовых файлов ──────────────────────────────────
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    rules: {
      // В тестах часто импортируют что-то только чтобы убедиться, что не падает
      '@typescript-eslint/no-unused-vars': 'off',
      // Разрешаем «висящие» промисы в тестах (waitFor, act)
      '@typescript-eslint/no-floating-promises': 'off',
      // console.log допустим в тестах
      'no-console': 'off',
    },
  },

  // ─── Игнорируемые пути (замена .eslintignore) ─────────────────────────────
  {
    ignores: [
      'dist',
      'build',
      'coverage',
      'playwright-report',
      'test-results',
      'node_modules',
      'public/mockServiceWorker.js',
    ],
  },
];
