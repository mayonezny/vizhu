# React Frontend Template

Продакшн-готовый стартер на React с **TanStack Query**, **Zustand**, **Feature Sliced Design** и полным набором инструментов для тестирования.

📖 **[Ультимативный гайд по всем библиотекам →](GUIDE.md)**

## Стек

| Категория            | Библиотека                            |
| -------------------- | ------------------------------------- |
| UI                   | React 19 + TypeScript                 |
| Бандлер              | Vite 7 (SWC)                          |
| Серверное состояние  | TanStack Query v5                     |
| Клиентское состояние | Zustand v5 + Immer                    |
| Роутинг              | React Router v7                       |
| HTTP                 | Axios                                 |
| Стилизация           | SCSS + CSS Variables                  |
| Формы                | react-hook-form + @hookform/resolvers |
| Валидация            | Zod                                   |
| Иконки               | lucide-react                          |
| Уведомления          | sonner                                |
| Дата/время           | date-fns                              |
| Drag & Drop          | @dnd-kit/core + @dnd-kit/sortable     |
| Интернационализация  | i18next + react-i18next               |
| Юнит-тесты           | Vitest + React Testing Library + MSW  |
| E2E-тесты            | Playwright                            |
| Линтер               | ESLint (flat config) + Prettier       |
| Git-хуки             | Husky v9 + lint-staged                |

## Начало работы

```bash
# 1. Установить зависимости
npm install

# 2. Настроить окружение
cp .env.example .env.development   # уже заполнен для локальной разработки

# 3. Запустить dev-сервер
npm run dev
# → http://localhost:3000
```

## Скрипты

| Скрипт                  | Описание                                 |
| ----------------------- | ---------------------------------------- |
| `npm run dev`           | Запустить dev-сервер на :3000            |
| `npm run build`         | Продакшн-сборка                          |
| `npm run build:dev`     | Dev-сборка (с source maps)               |
| `npm run preview`       | Предварительный просмотр продакшн-сборки |
| `npm run lint`          | Проверка линтером (ноль предупреждений)  |
| `npm run lint:fix`      | Автоисправление ошибок линтера           |
| `npm run format`        | Проверка форматирования Prettier         |
| `npm run format:fix`    | Форматирование всех файлов Prettier      |
| `npm run test`          | Запустить юнит-тесты                     |
| `npm run test:watch`    | Режим слежения                           |
| `npm run test:coverage` | Отчёт о покрытии                         |
| `npm run test:e2e`      | Playwright E2E-тесты                     |
| `npm run test:e2e:ui`   | Playwright в режиме UI                   |

## Архитектура: Feature Sliced Design (FSD)

Слои могут импортировать только из слоёв **ниже** по иерархии. Импорт вверх — запрещён.

```
src/
├── app/              # Инициализация приложения: провайдеры, роутер, глобальные стили
│   ├── providers/    # QueryProvider, Toaster; добавляйте AuthProvider, ThemeProvider…
│   ├── main.tsx
│   ├── router.tsx
│   └── index.css
│
├── pages/            # Компоненты страниц (цели роутов)
│   ├── HomePage/
│   └── DemoPage/
│
├── widgets/          # Крупные независимые UI-секции (из features + entities)
│   ├── Layout/       # Корневой лейаут с <Outlet />
│   └── DemoWidget/   # Демонстрационный компонент: TanStack Query + Zustand + форма
│
├── features/         # Пользовательские взаимодействия и бизнес-логика
│   └── counter/      # Пример Zustand-стора
│
├── entities/         # Бизнес-сущности (типы + API + базовые query-хуки)
│   └── post/
│
└── shared/           # Переиспользуемая инфраструктура (без бизнес-логики)
    ├── api/          # Экземпляр Axios + MSW-моки
    ├── config/       # Переменные окружения (валидируются через Zod)
    ├── lib/
    │   ├── tanstack-query/   # Конфигурация QueryClient
    │   └── zustand/          # Фабрики createStore / createPersistedStore
    └── types/        # Общие утилитарные TypeScript-типы
```

### Правила импортов FSD

```
app → pages → widgets → features → entities → shared
```

- `shared` ничего не импортирует из слоёв выше
- `entities` импортирует только из `shared`
- `features` импортирует из `entities` и `shared`
- `widgets` компонует `features` и `entities`
- `pages` используют `widgets`
- `app` связывает всё вместе

## Управление состоянием

### Zustand (клиентское состояние)

```ts
// src/features/my-feature/model/store.ts
import { createStore } from '@/shared/lib/zustand';

const useMyStore = createStore('MyFeature', (set) => ({
  value: 0,
  // immer позволяет мутировать черновик напрямую — спред не нужен
  increment: () =>
    set((draft) => {
      draft.value += 1;
    }),
}));

// Хуки-селекторы предотвращают лишние ре-рендеры
export const useValue = () => useMyStore((s) => s.value);
export const useMyActions = () => useMyStore(useShallow((s) => ({ increment: s.increment })));
```

### TanStack Query (серверное состояние)

```ts
// src/entities/post/api/post.queries.ts

// Фабрика ключей — типобезопасные иерархические ключи кэша
export const postKeys = {
  all: ['posts'] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  detail: (id: number) => [...postKeys.all, 'detail', id] as const,
};

// Хуки
export const usePosts = () => useQuery({ queryKey: postKeys.lists(), queryFn: postApi.getList });
export const usePost = (id: number | null) =>
  useQuery({
    queryKey: postKeys.detail(id!),
    queryFn: () => postApi.getById(id!),
    enabled: id !== null, // зависимый запрос — выполняется только когда id задан
  });
```

Полный рабочий пример: [src/widgets/DemoWidget](src/widgets/DemoWidget/) — useQuery, зависимый запрос, useMutation с оптимистичным обновлением, инвалидация кэша, состояния загрузки и ошибки.

## Переменные окружения

| Переменная             | Обязательна | По умолчанию        | Описание                               |
| ---------------------- | ----------- | ------------------- | -------------------------------------- |
| `VITE_API_URL`         | ✅          | —                   | Базовый URL для всех API-запросов      |
| `VITE_API_TIMEOUT`     | ❌          | `15000`             | Таймаут запроса (мс)                   |
| `VITE_APP_TITLE`       | ❌          | `Frontend Template` | Заголовок приложения                   |
| `VITE_APP_ENV`         | ❌          | `development`       | Название окружения                     |
| `VITE_ENABLE_DEVTOOLS` | ❌          | `true` в dev        | Показывать TanStack + Zustand DevTools |

Переменные валидируются через Zod при запуске — приложение немедленно падает, если обязательные переменные отсутствуют. См. [src/shared/config/env.ts](src/shared/config/env.ts).

## Тестирование

```bash
# Юнит + интеграционные (Vitest + RTL + MSW)
npm run test
npm run test:coverage

# E2E (Playwright) — только первый раз:
npx playwright install
npm run test:e2e
```

MSW-моки находятся в [src/shared/api/mocks/handlers.ts](src/shared/api/mocks/handlers.ts). Добавляйте хэндлеры туда, чтобы замокать новые эндпоинты во всех тестах.

## Анализ бандла

```bash
ANALYZE=true npm run build
# Открывает dist/stats.html с размерами gzip/brotli
```

**Приблизительный бюджет gzip:**

| Чанк                          | Размер      |
| ----------------------------- | ----------- |
| router-vendor (React Router)  | ~33 KB      |
| query-vendor (TanStack Query) | ~11 KB      |
| zustand-vendor                | ~0.4 KB     |
| Код приложения + остальное    | ~123 KB     |
| **Итого**                     | **~167 KB** |

> React 19 + новые библиотеки (date-fns, react-hook-form и др.) попадают в основной чанк.
> Для выделения в отдельные чанки добавьте их в `manualChunks` в `vite.config.ts`.

## Подключённые QoL-библиотеки

| Библиотека                     | Зачем                                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `clsx`                         | Условные классы без лишних template literal                                                                                          |
| `zod`                          | Валидация в рантайме: env-переменные, формы, ответы API                                                                              |
| `immer`                        | Мутабельные обновления в Zustand-сторах без spread                                                                                   |
| `sonner`                       | Toast-уведомления — `import { toast } from 'sonner'`                                                                                 |
| `react-hook-form`              | Управление формами с минимумом ре-рендеров                                                                                           |
| `@hookform/resolvers`          | Интеграция react-hook-form с Zod (и другими схемами)                                                                                 |
| `date-fns`                     | Форматирование и работа с датами, поддержка локалей                                                                                  |
| `lucide-react`                 | SVG-иконки, tree-shakeable, ~1 KB на иконку                                                                                          |
| `@dnd-kit/core`                | Drag & drop — модульный, доступный, touch-friendly                                                                                   |
| `@dnd-kit/sortable`            | Пресет для сортируемых списков поверх @dnd-kit/core                                                                                  |
| `i18next`                      | Движок интернационализации                                                                                                           |
| `react-i18next`                | React-биндинги для i18next — `useTranslation`, `<Trans>`                                                                             |
| `@tanstack/react-table`        | Headless-таблицы: сортировка, фильтрация, пагинация, группировка — без UI                                                            |
| `@tanstack/react-virtual`      | Виртуализация списков и таблиц — рендерит только видимые строки                                                                      |
| `react-error-boundary`         | Error Boundary как компонент — ловит крэши рендера, показывает fallback UI                                                           |
| `nuqs`                         | Синхронизация состояния с URL query-параметрами (`useQueryState` вместо `useState`)                                                  |
| `@radix-ui/react-dialog` и др. | Headless доступные примитивы: Dialog, DropdownMenu, Tooltip, Select, Tabs, Switch, Accordion, Slider, Avatar, Progress (+10 пакетов) |

> Установленные пакеты не увеличивают бандл до момента первого импорта — tree-shaking
> вырезает неиспользуемый код. Импортируйте только то, что реально нужно на конкретной странице.

## Что добавить при необходимости

В зависимости от потребностей проекта:

- **Компонентная библиотека**: shadcn/ui (требует Tailwind CSS) или `@radix-ui/themes`
- **Мониторинг ошибок**: `@sentry/react`
- **Auth**: реализовать в `src/app/providers/` и `src/entities/session/`
- **Storybook**: `@storybook/react-vite`
