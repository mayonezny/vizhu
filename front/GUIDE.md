# Ультимативный гайд по библиотекам React Frontend Template

> Практическое руководство по каждой библиотеке в проекте.
> Цель: незнакомый человек открывает раздел, читает 5 минут — и уже пишет рабочий код.

---

## Оглавление

**Ядро**

1. [React Router v7](#1-react-router-v7)
2. [TanStack Query v5](#2-tanstack-query-v5)
3. [Zustand v5 + Immer](#3-zustand-v5--immer)
4. [Zod](#4-zod)
5. [react-hook-form + @hookform/resolvers](#5-react-hook-form--hookformresolvers)
6. [Axios](#6-axios)

**UI / UX** 7. [SCSS + CSS Variables](#7-scss--css-variables) 8. [clsx](#8-clsx) 9. [Lucide React](#9-lucide-react) 10. [Radix UI](#10-radix-ui) 11. [Sonner](#11-sonner)

**Данные и утилиты** 12. [date-fns](#12-date-fns) 13. [i18next + react-i18next](#13-i18next--react-i18next) 14. [nuqs](#14-nuqs)

**Таблицы и списки** 15. [@tanstack/react-table](#15-tanstackreact-table) 16. [@tanstack/react-virtual](#16-tanstackreact-virtual)

**Специализированные** 17. [react-error-boundary](#17-react-error-boundary) 18. [@dnd-kit/core + @dnd-kit/sortable](#18-dnd-kitcore--dnd-kitsortable)

**Тестирование** 19. [MSW (Mock Service Worker)](#19-msw-mock-service-worker) 20. [Vitest + React Testing Library](#20-vitest--react-testing-library) 21. [Playwright](#21-playwright)

**Конфиги** 22. [Конфиги проекта](#22-конфиги-проекта)

**Встроенные хуки** 23. [useTheme — тёмная тема](#23-usetheme--тёмная-тема) 24. [useMediaQuery — адаптив](#24-usemediaquery--адаптив)

---

## 1. React Router v7

**Что это:** Стандартный роутер для React. v7 — это эволюция Remix, принёс Data Router, loader/action API и улучшенный TypeScript.

**Когда использовать:** Всегда — основа навигации любого SPA.

### Базовое использование

```tsx
// src/app/router.tsx — декларативное определение роутов
import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '@/widgets/Layout';
import { HomePage } from '@/pages/HomePage';
import { DemoPage } from '@/pages/DemoPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />, // Общая обёртка с <Outlet />
    children: [
      { index: true, element: <HomePage /> },
      { path: 'demo', element: <DemoPage /> },
    ],
  },
]);

// src/app/main.tsx
import { RouterProvider } from 'react-router-dom';
<RouterProvider router={router} />;
```

```tsx
// Layout — рендерит дочерние роуты
import { Outlet } from 'react-router-dom';

export const Layout = () => (
  <div className="layout">
    <header>...</header>
    <main>
      <Outlet />
    </main>{' '}
    {/* Сюда рендерятся дочерние роуты */}
  </div>
);
```

### Навигация

```tsx
import { Link, NavLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';

// Декларативная ссылка
<Link to="/demo">Демо</Link>

// NavLink — добавляет класс active для активного роута
<NavLink to="/demo" className={({ isActive }) => isActive ? 'nav--active' : ''}>
  Демо
</NavLink>

// Программная навигация
const navigate = useNavigate();
navigate('/demo');
navigate(-1);           // назад
navigate('/demo', { replace: true });  // без записи в history

// Параметры роута  /posts/:id
const { id } = useParams<{ id: string }>();

// URL query-params (?page=2&sort=date)
const [searchParams, setSearchParams] = useSearchParams();
const page = searchParams.get('page') ?? '1';
setSearchParams({ page: '2' });
```

### Защищённые роуты

```tsx
// src/app/router.tsx
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  return isAuth ? <>{children}</> : <Navigate to="/login" replace />;
};

// В роутере:
{ path: 'profile', element: <ProtectedRoute><ProfilePage /></ProtectedRoute> }
```

### Плюсы / Минусы

| +                                      | -                                                     |
| -------------------------------------- | ----------------------------------------------------- |
| Стандарт де-факто, огромная экосистема | v7 — ещё молодой, некоторые паттерны меняются         |
| Отличный TypeScript                    | Data Router (loaders/actions) — концептуально сложнее |
| Вложенные роуты + Layout-паттерн       | —                                                     |

---

## 2. TanStack Query v5

**Что это:** Библиотека для управления **серверным состоянием** — кэширование, загрузка, инвалидация, синхронизация данных с сервером.

**Главная идея:** Данные с сервера — это НЕ состояние приложения. Это кэш. TanStack Query управляет этим кэшем.

**Когда использовать:** Любой GET-запрос к API. Любая мутация (POST/PUT/DELETE) с обновлением UI.

### Настройка

```tsx
// src/shared/lib/tanstack-query/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 минут — данные считаются свежими
      retry: 1, // 1 повтор при ошибке
      refetchOnWindowFocus: false, // отключить рефетч при фокусе окна
    },
  },
});

// src/app/providers/QueryProvider.tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export const QueryProvider = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
    <ReactQueryDevtools initialIsOpen={false} /> {/* DevTools */}
  </QueryClientProvider>
);
```

### useQuery — получение данных

```tsx
// src/entities/post/api/post.queries.ts

// Фабрика ключей — обязательный паттерн!
// Даёт типобезопасные иерархические ключи кэша
export const postKeys = {
  all: ['posts'] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  detail: (id: number) => [...postKeys.all, 'detail', id] as const,
};

// Простой запрос
export const usePosts = () =>
  useQuery({
    queryKey: postKeys.lists(),
    queryFn: postApi.getList,
  });

// Зависимый запрос (выполняется только когда id задан)
export const usePost = (id: number | null) =>
  useQuery({
    queryKey: postKeys.detail(id!),
    queryFn: () => postApi.getById(id!),
    enabled: id !== null, // ключевой параметр
  });
```

```tsx
// В компоненте
const { data, isLoading, isError, error } = usePosts();

if (isLoading) return <Spinner />;
if (isError) return <Error message={error.message} />;

return (
  <ul>
    {data.map((post) => (
      <li key={post.id}>{post.title}</li>
    ))}
  </ul>
);
```

### useMutation — изменение данных

```tsx
// src/entities/post/api/post.queries.ts
export const useCreatePost = () =>
  useMutation({
    mutationFn: postApi.create,
    onSuccess: (newPost) => {
      // Инвалидация — TanStack Query перезапросит список
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });

      // ИЛИ оптимистичное обновление — добавляем в кэш сразу
      queryClient.setQueryData(postKeys.lists(), (old: Post[] = []) => [newPost, ...old]);
    },
  });

// В компоненте
const { mutate: createPost, isPending } = useCreatePost();

<button
  onClick={() => createPost({ title: 'Новый пост', body: '...', userId: 1 })}
  disabled={isPending}
>
  {isPending ? 'Создаём...' : 'Создать пост'}
</button>;
```

### Продвинутые паттерны

```tsx
// Ручная инвалидация (например, после WebSocket-события)
queryClient.invalidateQueries({ queryKey: postKeys.all });

// Prefetch (подгрузка при ховере)
const handleMouseEnter = () => {
  queryClient.prefetchQuery({
    queryKey: postKeys.detail(id),
    queryFn: () => postApi.getById(id),
  });
};

// Пагинация
const { data, isFetchingNextPage, fetchNextPage } = useInfiniteQuery({
  queryKey: postKeys.lists(),
  queryFn: ({ pageParam }) => postApi.getPage(pageParam),
  initialPageParam: 1,
  getNextPageParam: (lastPage) => lastPage.nextPage,
});

// Optimistic update с rollback
useMutation({
  mutationFn: updatePost,
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: postKeys.detail(newData.id) });
    const previous = queryClient.getQueryData(postKeys.detail(newData.id));
    queryClient.setQueryData(postKeys.detail(newData.id), newData);
    return { previous }; // контекст для rollback
  },
  onError: (err, newData, context) => {
    queryClient.setQueryData(postKeys.detail(newData.id), context?.previous);
  },
});
```

### Плюсы / Минусы

| +                                                  | -                                             |
| -------------------------------------------------- | --------------------------------------------- |
| Автоматический кэш, дедупликация запросов          | Концептуальный сдвиг: "не useState, а кэш"    |
| staleTime/gcTime — тонкая настройка свежести       | Немного больше бойлерплейта vs простого fetch |
| DevTools показывают весь кэш в реальном времени    | —                                             |
| Работает с любым async источником (не только HTTP) | —                                             |

---

## 3. Zustand v5 + Immer

**Что это:** Минималистичное управление **клиентским состоянием** (UI-состояние, настройки, данные, не связанные с сервером).

**Главная идея:** Если данные приходят с сервера — TanStack Query. Если живут только в браузере (открыт ли дропдаун, выбранный язык, счётчик) — Zustand.

### Настройка фабрик

```tsx
// src/shared/lib/zustand/createStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// Простой стор
export const createStore = <T extends object>(
  name: string,
  initializer: (set: (fn: (state: T) => void) => void, get: () => T) => T,
) => {
  return create<T>()(immer(initializer));
};

// Персистентный стор (сохраняется в localStorage)
export const createPersistedStore = <T extends object>(
  name: string,
  initializer: (set: (fn: (state: T) => void) => void, get: () => T) => T,
) => {
  return create<T>()(persist(immer(initializer), { name }));
};
```

### Создание стора

```tsx
// src/features/counter/model/store.ts
import { useShallow } from 'zustand/shallow';
import { createStore } from '@/shared/lib/zustand';

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

const useCounterStore = createStore<CounterState>('Counter', (set) => ({
  count: 0,
  // Immer позволяет мутировать draft — не нужен spread
  increment: () =>
    set((draft) => {
      draft.count += 1;
    }),
  decrement: () =>
    set((draft) => {
      draft.count -= 1;
    }),
  reset: () =>
    set((draft) => {
      draft.count = 0;
    }),
}));

// Экспортируем хуки-селекторы — предотвращают лишние ре-рендеры!
export const useCount = () => useCounterStore((s) => s.count);
export const useCounterActions = () =>
  useCounterStore(
    useShallow((s) => ({
      increment: s.increment,
      decrement: s.decrement,
      reset: s.reset,
    })),
  );
```

```tsx
// В компоненте — подписываемся только на нужные данные
const count = useCount();
const { increment, decrement, reset } = useCounterActions();
```

### Почему хуки-селекторы важны

```tsx
// БЕЗ селектора — компонент ре-рендерится при ЛЮБОМ изменении стора:
const { count, increment } = useCounterStore(); // плохо

// С селектором — ре-рендер только когда count изменился:
const count = useCounterStore((s) => s.count); // хорошо

// useShallow для объектов — сравнивает поверхностно:
const { increment } = useCounterStore(useShallow((s) => ({ increment: s.increment })));
```

### Immer: зачем нужен

```tsx
// Без Immer — нужен spread для каждого поля:
set((state) => ({
  ...state,
  user: {
    ...state.user,
    address: {
      ...state.user.address,
      city: 'Москва',
    },
  },
}));

// С Immer — просто мутируем:
set((draft) => {
  draft.user.address.city = 'Москва';
});
```

### Персистентный стор

```tsx
// Данные сохраняются в localStorage автоматически
const useSettingsStore = createPersistedStore('settings', (set) => ({
  language: 'ru' as 'ru' | 'en',
  theme: 'light' as 'light' | 'dark',
  setLanguage: (lang: 'ru' | 'en') =>
    set((draft) => {
      draft.language = lang;
    }),
}));
```

### Zustand DevTools

```tsx
// Уже настроено в createStore — в Redux DevTools видны все изменения стора
import { devtools } from 'zustand/middleware';
```

### Плюсы / Минусы

| +                                             | -                                    |
| --------------------------------------------- | ------------------------------------ |
| Минимальный бойлерплейт (~5 строк на стор)    | Не подходит для серверного состояния |
| Нет Provider-ов — стор глобальный             | Нет встроенной валидации             |
| Immer убирает spread-hell                     | —                                    |
| Работает вне React (в сервисах, обработчиках) | —                                    |

---

## 4. Zod

**Что это:** Библиотека валидации с выводом TypeScript-типов. Одна схема — и тип, и валидация в рантайме.

**Когда использовать:** Всегда, когда данные приходят извне: формы, API-ответы, переменные окружения.

### Базовые схемы

```ts
import { z } from 'zod';

// Примитивы
const name = z.string().min(2).max(50);
const age = z.number().int().positive().max(120);
const email = z.string().email();
const url = z.string().url();
const isActive = z.boolean();

// Объект
const UserSchema = z.object({
  id: z.number(),
  name: z.string().min(1, 'Имя обязательно'),
  email: z.string().email('Неверный email'),
  age: z.number().optional(),
  role: z.enum(['admin', 'user', 'moderator']),
});

// Вывод типа из схемы — не нужно писать тип отдельно!
type User = z.infer<typeof UserSchema>;
```

### Валидация

```ts
// parse — бросает исключение при ошибке
const user = UserSchema.parse(rawData);

// safeParse — возвращает { success, data } или { success: false, error }
const result = UserSchema.safeParse(rawData);
if (result.success) {
  console.log(result.data); // типизировано!
} else {
  console.log(result.error.flatten()); // { fieldErrors: { name: ['...'] } }
}
```

### Схемы для форм

```ts
// src/widgets/DemoWidget — реальный пример из проекта
const postSchema = z.object({
  title: z.string().min(5, 'Минимум 5 символов').max(100, 'Максимум 100 символов'),
  body: z.string().min(10, 'Минимум 10 символов'),
});

type PostFormValues = z.infer<typeof postSchema>;
```

### Валидация env-переменных

```ts
// src/shared/config/env.ts — реальный пример из проекта
const envSchema = z.object({
  VITE_API_URL: z.string().url(),
  VITE_API_TIMEOUT: z.coerce.number().default(15000), // coerce — строку в число
  VITE_APP_TITLE: z.string().default('Frontend Template'),
  VITE_APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
});

// Приложение упадёт сразу, если переменные неверные
export const env = envSchema.parse(import.meta.env);
```

### Продвинутые паттерны

```ts
// Трансформация
const DateSchema = z.string().transform((s) => new Date(s));

// Кастомная валидация
const PasswordSchema = z
  .string()
  .min(8)
  .refine((val) => /[A-Z]/.test(val), 'Нужна заглавная буква')
  .refine((val) => /[0-9]/.test(val), 'Нужна цифра');

// Зависимые поля
const RegisterSchema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

// Объединение схем
const BaseSchema = z.object({ id: z.number() });
const UserSchema = BaseSchema.extend({ name: z.string() });

// Частичная схема (все поля опциональны) — для PATCH-запросов
const UpdateUserSchema = UserSchema.partial();
```

### Плюсы / Минусы

| +                                                  | -                                  |
| -------------------------------------------------- | ---------------------------------- |
| Тип выводится автоматически — один источник правды | Синтаксис поначалу непривычен      |
| Отличные сообщения об ошибках                      | Немного больше bundle-size чем yup |
| Работает везде: формы, API, env                    | —                                  |
| Composable: схемы расширяются и комбинируются      | —                                  |

---

## 5. react-hook-form + @hookform/resolvers

**Что это:** Управление формами через **неконтролируемые компоненты** (через ref, а не state). До 100× меньше ре-рендеров чем у Formik.

**Главная идея:** Не хранить значения полей в React-состоянии. Читать их из DOM напрямую только при нужных событиях.

### Базовое использование

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(5, 'Минимум 5 символов'),
  body: z.string().min(10, 'Минимум 10 символов'),
});

type FormValues = z.infer<typeof schema>;

const MyForm = () => {
  const {
    register, // привязывает поле к форме
    handleSubmit, // обёртка onSubmit с валидацией
    formState: { errors, isSubmitting },
    reset, // сброс формы
    watch, // наблюдение за значением поля
    setValue, // программная установка значения
  } = useForm<FormValues>({
    resolver: zodResolver(schema), // zod как валидатор
    defaultValues: { title: '', body: '' },
  });

  const onSubmit = (data: FormValues) => {
    // data — уже провалидированные данные, типизированные
    console.log(data);
    reset(); // очистить форму
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="title">Заголовок</label>
        <input
          id="title"
          {...register('title')} // регистрирует поле: ref, name, onChange, onBlur
          className={errors.title ? 'input--invalid' : ''}
        />
        {errors.title && <span>{errors.title.message}</span>}
      </div>

      <div>
        <label htmlFor="body">Текст</label>
        <textarea id="body" {...register('body')} />
        {errors.body && <span>{errors.body.message}</span>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        Отправить
      </button>
    </form>
  );
};
```

### Важные хуки

```tsx
// watch — следить за значением (вызывает ре-рендер при изменении)
const titleValue = watch('title');
const allValues = watch(); // все поля

// Controller — для кастомных/UI-компонентов без нативного ref
import { Controller } from 'react-hook-form';

<Controller
  name="category"
  control={control}
  render={({ field }) => (
    <CustomSelect value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
  )}
/>;

// useFieldArray — динамические списки полей
import { useFieldArray } from 'react-hook-form';

const { fields, append, remove } = useFieldArray({
  control,
  name: 'items',
});

// Режим валидации (по умолчанию: при submit)
useForm({ mode: 'onChange' }); // валидация при каждом изменении
useForm({ mode: 'onBlur' }); // валидация при потере фокуса
```

### Интеграция с мутациями TanStack Query

```tsx
// Реальный паттерн из DemoWidget
const { mutate: createPost, isPending } = useCreatePost();

const onSubmit = (data: PostFormValues) => {
  createPost(
    { userId: 1, title: data.title, body: data.body },
    {
      onSuccess: () => {
        toast.success('Пост создан!');
        reset(); // очищаем форму только после успеха
      },
      onError: (err) => toast.error('Ошибка', { description: err.message }),
    },
  );
};
```

### Плюсы / Минусы

| +                                               | -                                        |
| ----------------------------------------------- | ---------------------------------------- |
| Минимум ре-рендеров — форма не обновляет дерево | Немного непривычен после controlled-форм |
| Нативная интеграция с Zod через resolver        | Controller нужен для UI-библиотек        |
| Хорошо работает с любым числом полей            | —                                        |
| isSubmitting, isDirty, isValid из коробки       | —                                        |

---

## 6. Axios

**Что это:** HTTP-клиент с интерцепторами, автоматической сериализацией JSON и удобным API.

### Настройка инстанса

```ts
// src/shared/api/axios.ts
import axios from 'axios';
import { env } from '@/shared/config/env';

export const apiClient = axios.create({
  baseURL: env.VITE_API_URL,
  timeout: env.VITE_API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — добавляем токен
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — обработка ошибок
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Редирект на логин или refresh токена
    }
    return Promise.reject(error);
  },
);
```

### Типизированные API-функции

```ts
// src/entities/post/api/post.api.ts
import type { Post, CreatePostDto } from '../model/types';

export const postApi = {
  getList: () => apiClient.get<Post[]>('/posts').then((r) => r.data),

  getById: (id: number) => apiClient.get<Post>(`/posts/${id}`).then((r) => r.data),

  create: (dto: CreatePostDto) => apiClient.post<Post>('/posts', dto).then((r) => r.data),

  update: (id: number, dto: Partial<CreatePostDto>) =>
    apiClient.put<Post>(`/posts/${id}`, dto).then((r) => r.data),

  remove: (id: number) => apiClient.delete(`/posts/${id}`).then((r) => r.data),
};
```

### Плюсы / Минусы

| +                                     | -                                              |
| ------------------------------------- | ---------------------------------------------- |
| Интерцепторы для Auth/логирования     | Немного больше fetch (но это минимально)       |
| Автоматический JSON parse/stringify   | Нет встроенного кэша (это роль TanStack Query) |
| Отмена запросов через AbortController | —                                              |
| Единый инстанс — легко менять baseURL | —                                              |

---

## 7. SCSS + CSS Variables

**Что это:** SCSS — препроцессор CSS. Компилируется в обычный CSS при сборке — браузер видит только CSS.
CSS Variables — нативные переменные браузера, которые меняются в рантайме (темы, динамические значения).

---

### Переменные `$`

SCSS-переменные — **компайл-тайм**, в итоговом CSS исчезают. Используйте для значений, которые не меняются в рантайме.

```scss
// src/shared/styles/_variables.scss
$color-primary: #3b82f6;
$border-radius-md: 0.5rem;
$transition-fast: 150ms ease;
$font-size-base: 1rem;

// Использование
.btn {
  background: $color-primary;
  border-radius: $border-radius-md;
  transition: opacity $transition-fast;
}
```

> **Отличие от CSS Variables (`--var`):** SCSS-переменные нельзя прочитать или изменить из JavaScript и нельзя переопределить в медиа-запросах или `[data-theme]`.

---

### Вложенность и `&`

```scss
.card {
  padding: 1rem;

  // Дочерний элемент — компилируется в .card__title
  &__title {
    font-size: 1.25rem;
  }

  // Модификатор — .card--large
  &--large {
    padding: 2rem;
  }

  // Псевдокласс — .card:hover
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  // Псевдоэлемент — .card::before
  &::before {
    content: '';
    display: block;
  }

  // Медиа внутри блока — держим рядом с компонентом
  @media (max-width: 768px) {
    padding: 0.75rem;
  }
}
```

```scss
// & как суффикс — состояние на том же элементе
.btn {
  &.is-loading {
    opacity: 0.6;
    pointer-events: none;
  }

  // Обратный контекст: «когда .btn внутри .sidebar»
  .sidebar & {
    width: 100%;
  }
}
```

---

### Миксины `@mixin` / `@include`

Переиспользуемые блоки CSS с поддержкой аргументов и `@content`.

```scss
// src/shared/styles/_mixins.scss
@use 'sass:map';

// Простой миксин
@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

// С аргументами и дефолтным значением
@mixin truncate($lines: 1) {
  @if $lines == 1 {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  } @else {
    display: -webkit-box;
    -webkit-line-clamp: $lines;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

// Брейкпоинты — одно место для всех медиа-запросов
$breakpoints: (
  'sm': 640px,
  'md': 768px,
  'lg': 1024px,
  'xl': 1280px,
);

// @content — вставляет переданный блок стилей
@mixin breakpoint($name) {
  @media (max-width: map.get($breakpoints, $name)) {
    @content;
  }
}

// Скрыт визуально, но читается скринридером (accessibility)
@mixin visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

// Использование
.hero {
  @include flex-center;

  &__title {
    @include truncate(2);
  }
  &__sr-only {
    @include visually-hidden;
  }

  @include breakpoint('md') {
    flex-direction: column;
  }
}
```

---

### Функции `@function`

Возвращают значение — в отличие от миксина, который вставляет блок свойств.

```scss
@use 'sass:math';
@use 'sass:map';

// px → rem
@function rem($px) {
  @return math.div($px, 16) * 1rem;
}

// Типизированный z-index — не нужно помнить числа
$z-layers: (
  'base': 1,
  'dropdown': 100,
  'modal': 200,
  'toast': 300,
);

@function z($layer) {
  @return map.get($z-layers, $layer);
}

// Использование
.hero {
  font-size: rem(18);
} // → 1.125rem
.dropdown {
  z-index: z('dropdown');
} // → 100
.modal {
  z-index: z('modal');
} // → 200
```

---

### Партиалы, `@use` и `@forward`

Файлы с `_` в начале имени — партиалы (не компилируются в отдельный CSS).

```scss
// src/shared/styles/index.scss — один файл для импорта всего
@forward 'variables';
@forward 'mixins';
@forward 'functions';
```

```scss
// В компоненте — @use вместо устаревшего @import
// @import — глобальный namespace, конфликты переменных
// @use   — изолированный namespace, явные зависимости

@use '@/shared/styles' as *; // as * — доступ без префикса

.my-component {
  color: $color-primary; // из _variables
  font-size: rem(14); // из _functions
  @include flex-center; // из _mixins
}
```

---

### Карты (Maps) + генерация классов через `@each`

```scss
@use 'sass:map';

$badge-variants: (
  'success': (
    #dcfce7,
    #166534,
  ),
  'error': (
    #fee2e2,
    #991b1b,
  ),
  'warning': (
    #fef9c3,
    #854d0e,
  ),
  'info': (
    #dbeafe,
    #1e40af,
  ),
);

// Генерируем классы автоматически — вместо copy-paste
@each $name, $colors in $badge-variants {
  .badge--#{$name} {
    // #{} — интерполяция в имени класса
    background: nth($colors, 1);
    color: nth($colors, 2);
  }
}
// Результат: .badge--success { ... } .badge--error { ... } ...
```

---

### Циклы `@for` / `@each` для утилит

```scss
// @for — числовой диапазон (1 to N — не включает N; 1 through N — включает)
@for $i from 1 through 12 {
  .col-#{$i} {
    width: math.percentage(math.div($i, 12));
  }
}

// @each по списку
@each $side in (top, right, bottom, left) {
  .m-#{$side}-auto {
    margin-#{$side}: auto;
  }
}

// Утилиты отступов
$spaces: (
  0: 0,
  1: 0.25rem,
  2: 0.5rem,
  4: 1rem,
  6: 1.5rem,
  8: 2rem,
);

@each $key, $val in $spaces {
  .p-#{$key} {
    padding: $val;
  }
  .pt-#{$key} {
    padding-top: $val;
  }
  .pb-#{$key} {
    padding-bottom: $val;
  }
  .m-#{$key} {
    margin: $val;
  }
  .mt-#{$key} {
    margin-top: $val;
  }
  .mb-#{$key} {
    margin-bottom: $val;
  }
}
```

---

### Условия `@if` / `@else`

```scss
@mixin button-variant($style: 'primary') {
  @if $style == 'primary' {
    background: var(--color-primary);
    color: white;
    &:hover {
      background: var(--color-primary-hover);
    }
  } @else if $style == 'ghost' {
    background: transparent;
    border: 1px solid var(--color-primary);
    color: var(--color-primary);
  } @else {
    @warn "Неизвестный стиль: #{$style}"; // @warn — в консоль сборщика
    // @error — остановит сборку
  }
}

.btn--primary {
  @include button-variant('primary');
}
.btn--ghost {
  @include button-variant('ghost');
}
```

---

### Placeholder `%` и `@extend`

```scss
// Невидимый класс — в CSS не попадёт, пока кто-то не расширит
%card-base {
  border-radius: var(--border-radius-lg);
  background: var(--color-surface);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
}

.post-card {
  @extend %card-base;
}
.profile-card {
  @extend %card-base;
  border: 2px solid var(--color-primary);
}

// Компилируется в одно правило:
// .post-card, .profile-card { border-radius: ...; background: ...; }
```

> Используйте `@extend` осторожно — создаёт неочевидные связи между компонентами. Миксины понятнее.

---

### Встроенные модули Sass

```scss
@use 'sass:math';
@use 'sass:color';
@use 'sass:string';
@use 'sass:list';

// math
math.div(10, 3)             // 3.333... (/ для деления устарел)
math.round(3.7)             // 4
math.percentage(0.75)       // 75%
math.min(10px, 1rem)        // меньшее

// color
color.adjust(#3b82f6, $lightness: 10%)    // светлее на 10%
color.adjust(#3b82f6, $alpha: -0.3)       // полупрозрачнее
color.mix(#ff0000, #0000ff, 50%)           // фиолетовый
color.scale(#3b82f6, $saturation: -50%)   // менее насыщенный
color.channel(#3b82f6, 'red')             // значение red-канала = 59

// string
string.to-upper-case('hello')   // 'HELLO'
string.length('hello')          // 5
string.index('hello', 'ell')    // 2

// list
list.length(1px 2px 3px)        // 3
list.nth(1px 2px 3px, 2)        // 2px
list.append(1px 2px, 3px)       // 1px 2px 3px
```

---

### Интерполяция `#{}`

Вставка значения переменной в произвольное место строки.

```scss
$prop: 'margin';
$side: 'top';

.el {
  #{$prop}-#{$side}: 1rem; // → margin-top: 1rem
}

// Динамические медиа
$sizes: (
  sm: 640px,
  md: 768px,
  lg: 1024px,
);
@each $name, $px in $sizes {
  .hide-#{$name} {
    @media (max-width: #{$px}) {
      display: none;
    }
  }
}
```

---

### CSS Variables (Custom Properties) для тем

В отличие от SCSS-переменных — живут в браузере, меняются в рантайме.

```css
/* src/app/index.css */
:root {
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-surface: #ffffff;
  --color-surface-elevated: #f8fafc;
  --color-text: #1f2937;
  --color-text-muted: #6b7280;
  --color-border: #e5e7eb;
  --color-error: #ef4444;

  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  --border-radius-sm: 0.375rem;
  --border-radius-md: 0.5rem;
  --border-radius-lg: 0.75rem;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --transition: 150ms ease;
}

/* Тёмная тема — только переопределяем нужное */
[data-theme='dark'] {
  --color-surface: #1e293b;
  --color-surface-elevated: #0f172a;
  --color-text: #f1f5f9;
  --color-text-muted: #94a3b8;
  --color-border: #334155;
}
```

```tsx
// Переключение темы из React
const toggleTheme = () => {
  const root = document.documentElement;
  root.setAttribute('data-theme', root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
};

// Динамическое значение через JS (например, прогресс-бар)
element.style.setProperty('--progress-value', `${percent}%`);
```

```scss
// В SCSS используем CSS Variables для динамики, SCSS-переменные для констант
.btn {
  background: var(--color-primary); // CSS Variable — меняется с темой
  border-radius: $border-radius-md; // SCSS — константа времени сборки
  transition: background var(--transition);
}
```

---

### Структура файлов стилей в проекте

```
src/
├── app/
│   └── index.css              # CSS Variables (токены), глобальный сброс, шрифты
└── shared/
    └── styles/
        ├── _variables.scss    # SCSS-переменные (константы)
        ├── _mixins.scss       # Миксины (breakpoint, flex-center, truncate...)
        ├── _functions.scss    # Функции (rem, z-index...)
        └── index.scss         # @forward всего — один @use в компонентах
```

Каждый компонент хранит свой SCSS рядом с собой:

```
src/widgets/DemoWidget/ui/
├── index.tsx
└── demo-widget.scss   ← стили только для этого компонента
```

### Плюсы / Минусы

| +                                                  | -                                                           |
| -------------------------------------------------- | ----------------------------------------------------------- |
| CSS Variables меняются в рантайме (темы, динамика) | `@extend` создаёт неочевидные зависимости — осторожно       |
| Миксины + функции убирают повторение               | Без методологии (BEM) классы быстро превращаются в хаос     |
| `@use` — изолированные namespace, нет конфликтов   | SCSS — компайл-тайм; для рантайм-логики нужны CSS Variables |
| `@each` / `@for` — генерация утилитарных классов   | —                                                           |
| BEM + нестинг = читаемый, предсказуемый код        | —                                                           |

---

## 8. clsx

**Что это:** Утилита для условного составления className. 300 байт.

```tsx
import clsx from 'clsx';

// Вместо неудобного template literal:
// className={`btn ${isPrimary ? 'btn--primary' : ''} ${isDisabled ? 'btn--disabled' : ''}`}

// Используем clsx:
<button
  className={clsx(
    'btn',
    isPrimary && 'btn--primary', // добавляет только если true
    isDisabled && 'btn--disabled',
    variant === 'large' && 'btn--lg',
    { 'btn--loading': isLoading }, // объект: ключ = класс, значение = условие
  )}
>
  Click
</button>;

// Результат: 'btn btn--primary btn--lg'
```

---

## 9. Lucide React

**Что это:** Коллекция ~1500 SVG-иконок как React-компоненты. Tree-shakeable — каждая иконка ~1 KB.

```tsx
import { Search, Plus, Trash2, ChevronDown, Loader2 } from 'lucide-react';

// Базовое использование
<Search />

// Настройка
<Search
  size={20}              // или width/height
  strokeWidth={1.5}      // толщина линий (по умолчанию 2)
  color="currentColor"   // наследует цвет текста
  className="icon"       // стандартный className
/>

// Спиннер через анимацию CSS
<Loader2 className="icon--spinning" />
// .icon--spinning { animation: spin 1s linear infinite; }

// Важно: импортируйте только нужные иконки — не весь пакет!
// import { ... } from 'lucide-react'  ✅ правильно
// import * as Icons from 'lucide-react'  ❌ тянет всё
```

---

## 10. Radix UI

**Что это:** Коллекция **headless** (без стилей) доступных UI-примитивов. Каждый пакет — отдельный компонент: Dialog, DropdownMenu, Tooltip, Select и т.д.

**Главная идея:** Radix решает сложную часть (доступность, клавиатурная навигация, ARIA, фокус-ловушки) — вы стилизуете как хотите. Никаких принудительных классов.

**Установленные пакеты:**

```
@radix-ui/react-dialog         # Модальное окно
@radix-ui/react-alert-dialog   # Диалог подтверждения
@radix-ui/react-dropdown-menu  # Выпадающее меню
@radix-ui/react-tooltip        # Подсказка при ховере
@radix-ui/react-select         # Кастомный select
@radix-ui/react-popover        # Всплывающий контейнер
@radix-ui/react-tabs           # Вкладки
@radix-ui/react-label          # Метка формы (связана с полем)
@radix-ui/react-separator      # Разделительная линия
@radix-ui/react-switch         # Переключатель вкл/выкл
@radix-ui/react-checkbox       # Чекбокс
@radix-ui/react-accordion      # Аккордеон
@radix-ui/react-progress       # Прогресс-бар
@radix-ui/react-slider         # Ползунок
@radix-ui/react-avatar         # Аватар с fallback
```

### Паттерн: составные компоненты

Все Radix-компоненты используют **compound components** — каждый элемент отдельно:

```tsx
// Каждый * — отдельный DOM-элемент, который вы стилизуете
<Dialog.Root>        // логика + состояние
  <Dialog.Trigger>   // кнопка открытия
  <Dialog.Portal>    // рендер вне DOM-дерева (body)
    <Dialog.Overlay> // затемнение фона
    <Dialog.Content> // само окно
      <Dialog.Title>
      <Dialog.Description>
      <Dialog.Close> // кнопка закрытия
```

### Dialog — модальное окно

```tsx
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

const ConfirmModal = ({ onConfirm }: { onConfirm: () => void }) => (
  <Dialog.Root>
    <Dialog.Trigger asChild>
      {/* asChild — Radix не создаёт лишний DOM-элемент, использует ваш */}
      <button className="btn btn--primary">Открыть</button>
    </Dialog.Trigger>

    <Dialog.Portal>
      <Dialog.Overlay className="dialog-overlay" /> {/* затемнение */}
      <Dialog.Content className="dialog-content">
        <Dialog.Title className="dialog__title">Подтверждение</Dialog.Title>
        <Dialog.Description className="dialog__description">
          Вы уверены? Это действие нельзя отменить.
        </Dialog.Description>

        <div className="dialog__footer">
          <Dialog.Close asChild>
            <button className="btn btn--secondary">Отмена</button>
          </Dialog.Close>
          <button className="btn btn--danger" onClick={onConfirm}>
            Удалить
          </button>
        </div>

        <Dialog.Close asChild>
          <button className="dialog__close" aria-label="Закрыть">
            <X size={16} />
          </button>
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);
```

```scss
// Стилизация — полная свобода
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  // Анимация через data-атрибуты Radix
  &[data-state='open'] {
    animation: fadeIn 150ms ease;
  }
  &[data-state='closed'] {
    animation: fadeOut 150ms ease;
  }
}

.dialog-content {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--color-surface);
  border-radius: 0.75rem;
  padding: 1.5rem;
  width: min(90vw, 450px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
```

### DropdownMenu — выпадающее меню

```tsx
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';

const ActionsMenu = ({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) => (
  <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild>
      <button className="btn btn--icon" aria-label="Действия">
        <MoreHorizontal size={16} />
      </button>
    </DropdownMenu.Trigger>

    <DropdownMenu.Portal>
      <DropdownMenu.Content className="dropdown" sideOffset={4} align="end">
        <DropdownMenu.Item className="dropdown__item" onSelect={onEdit}>
          <Edit size={14} /> Редактировать
        </DropdownMenu.Item>

        <DropdownMenu.Separator className="dropdown__separator" />

        <DropdownMenu.Item className="dropdown__item dropdown__item--danger" onSelect={onDelete}>
          <Trash2 size={14} /> Удалить
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
);
```

### Tooltip — подсказка

```tsx
import * as Tooltip from '@radix-ui/react-tooltip';

// Provider — один раз в AppProviders
// <Tooltip.Provider delayDuration={300}>...</Tooltip.Provider>

const IconButton = ({ icon, label }: { icon: ReactNode; label: string }) => (
  <Tooltip.Root>
    <Tooltip.Trigger asChild>
      <button className="btn btn--icon">{icon}</button>
    </Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Content className="tooltip" sideOffset={4}>
        {label}
        <Tooltip.Arrow className="tooltip__arrow" />
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>
);
```

### Select — кастомный выпадающий список

```tsx
import * as Select from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';

<Select.Root value={value} onValueChange={setValue}>
  <Select.Trigger className="select__trigger">
    <Select.Value placeholder="Выберите категорию" />
    <Select.Icon>
      <ChevronDown size={14} />
    </Select.Icon>
  </Select.Trigger>

  <Select.Portal>
    <Select.Content className="select__content" position="popper">
      <Select.Viewport>
        <Select.Item value="tech" className="select__item">
          <Select.ItemText>Технологии</Select.ItemText>
          <Select.ItemIndicator>
            <Check size={12} />
          </Select.ItemIndicator>
        </Select.Item>
        <Select.Item value="science" className="select__item">
          <Select.ItemText>Наука</Select.ItemText>
          <Select.ItemIndicator>
            <Check size={12} />
          </Select.ItemIndicator>
        </Select.Item>
      </Select.Viewport>
    </Select.Content>
  </Select.Portal>
</Select.Root>;
```

### Tabs — вкладки

```tsx
import * as Tabs from '@radix-ui/react-tabs';

<Tabs.Root defaultValue="posts" className="tabs">
  <Tabs.List className="tabs__list" aria-label="Контент">
    <Tabs.Trigger className="tabs__trigger" value="posts">
      Посты
    </Tabs.Trigger>
    <Tabs.Trigger className="tabs__trigger" value="comments">
      Комментарии
    </Tabs.Trigger>
  </Tabs.List>

  <Tabs.Content className="tabs__content" value="posts">
    <PostsList />
  </Tabs.Content>
  <Tabs.Content className="tabs__content" value="comments">
    <CommentsList />
  </Tabs.Content>
</Tabs.Root>;
```

### Switch + Checkbox + Label

```tsx
import * as Switch from '@radix-ui/react-switch';
import * as Checkbox from '@radix-ui/react-checkbox';
import * as Label from '@radix-ui/react-label';
import { Check } from 'lucide-react';

// Switch — семантически правильный toggle
<div className="field">
  <Label.Root htmlFor="notifications">Уведомления</Label.Root>
  <Switch.Root id="notifications" checked={enabled} onCheckedChange={setEnabled}>
    <Switch.Thumb />  {/* кружок внутри переключателя */}
  </Switch.Root>
</div>

// Checkbox
<div className="field">
  <Checkbox.Root id="agree" checked={agreed} onCheckedChange={setAgreed}>
    <Checkbox.Indicator>
      <Check size={12} />
    </Checkbox.Indicator>
  </Checkbox.Root>
  <Label.Root htmlFor="agree">Согласен с условиями</Label.Root>
</div>
```

### Accordion

```tsx
import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';

<Accordion.Root type="single" collapsible className="accordion">
  <Accordion.Item value="item-1" className="accordion__item">
    <Accordion.Header>
      <Accordion.Trigger className="accordion__trigger">
        Первый вопрос
        <ChevronDown className="accordion__icon" />
        {/* data-state='open'/'closed' — для CSS анимации поворота иконки */}
      </Accordion.Trigger>
    </Accordion.Header>
    <Accordion.Content className="accordion__content">Ответ на первый вопрос...</Accordion.Content>
  </Accordion.Item>
</Accordion.Root>;
```

### AlertDialog — диалог подтверждения

```tsx
// Отличие от Dialog: фокус-ловушка не позволяет случайно закрыть,
// Cancel/Action семантически правильные роли
import * as AlertDialog from '@radix-ui/react-alert-dialog';

<AlertDialog.Root>
  <AlertDialog.Trigger asChild>
    <button className="btn btn--danger">Удалить аккаунт</button>
  </AlertDialog.Trigger>
  <AlertDialog.Portal>
    <AlertDialog.Overlay className="dialog-overlay" />
    <AlertDialog.Content className="dialog-content">
      <AlertDialog.Title>Удалить аккаунт?</AlertDialog.Title>
      <AlertDialog.Description>
        Это действие необратимо. Все данные будут удалены.
      </AlertDialog.Description>
      <div className="dialog__footer">
        <AlertDialog.Cancel asChild>
          <button className="btn btn--secondary">Отмена</button>
        </AlertDialog.Cancel>
        <AlertDialog.Action asChild>
          <button className="btn btn--danger" onClick={deleteAccount}>
            Да, удалить
          </button>
        </AlertDialog.Action>
      </div>
    </AlertDialog.Content>
  </AlertDialog.Portal>
</AlertDialog.Root>;
```

### Progress + Slider + Avatar

```tsx
import * as Progress from '@radix-ui/react-progress';
import * as Slider from '@radix-ui/react-slider';
import * as Avatar from '@radix-ui/react-avatar';

// Прогресс-бар
<Progress.Root className="progress" value={75}>
  <Progress.Indicator
    className="progress__bar"
    style={{ transform: `translateX(-${100 - 75}%)` }}
  />
</Progress.Root>

// Ползунок (volume, price range)
<Slider.Root
  className="slider"
  defaultValue={[50]}
  min={0} max={100} step={1}
  onValueChange={([val]) => setVolume(val)}
>
  <Slider.Track className="slider__track">
    <Slider.Range className="slider__range" />
  </Slider.Track>
  <Slider.Thumb className="slider__thumb" aria-label="Громкость" />
</Slider.Root>

// Аватар с fallback
<Avatar.Root className="avatar">
  <Avatar.Image src={user.avatarUrl} alt={user.name} className="avatar__img" />
  {/* Показывается если изображение не загрузилось */}
  <Avatar.Fallback className="avatar__fallback" delayMs={600}>
    {user.name.slice(0, 2).toUpperCase()}
  </Avatar.Fallback>
</Avatar.Root>
```

### data-state и другие data-атрибуты Radix

#### Что это и как работает

Radix автоматически проставляет `data-*` атрибуты на DOM-элементы при изменении состояния.
Никакой настройки не требуется — они появляются сами. Ваша задача — реагировать на них в CSS.

```html
<!-- Что Radix рендерит в DOM при открытом аккордеоне -->
<button data-state="open" data-disabled class="accordion__trigger">...</button>
<div data-state="open" class="accordion__content">...</div>

<!-- При закрытом -->
<button data-state="closed" class="accordion__trigger">...</button>
```

#### Полная таблица data-state по компонентам

| Компонент              | Элемент                | Значения `data-state`                           |
| ---------------------- | ---------------------- | ----------------------------------------------- |
| Dialog / AlertDialog   | Overlay, Content       | `open` / `closed`                               |
| DropdownMenu / Popover | Trigger, Content       | `open` / `closed`                               |
| Tooltip                | Trigger, Content       | `delayed-open` / `instant-open` / `closed`      |
| Select                 | Trigger, Content       | `open` / `closed`                               |
| Accordion              | Item, Trigger, Content | `open` / `closed`                               |
| Switch                 | Root                   | `checked` / `unchecked`                         |
| Checkbox               | Root                   | `checked` / `unchecked` / `indeterminate`       |
| Tabs                   | Trigger                | `active` / `inactive`                           |
| Avatar                 | Image                  | `loading` / `loaded` / `error`                  |
| Avatar                 | Fallback               | — (рендерится только если Image не загрузилась) |

#### Другие data-атрибуты (не только state)

Radix добавляет ещё несколько атрибутов — для позиционирования, доступности и стилизации:

```html
<!-- data-side / data-align — куда открылся Popover/Tooltip/DropdownMenu -->
<div data-state="open" data-side="bottom" data-align="center" class="dropdown">
  <!-- data-disabled — элемент задизейблен -->
  <button data-disabled class="select__item">Недоступный пункт</button>

  <!-- data-highlighted — элемент в фокусе (клавиатура или ховер) -->
  <div data-highlighted class="dropdown__item">Пункт меню</div>

  <!-- data-placeholder — когда Select не выбрано ничего -->
  <span data-placeholder class="select__value">Выберите вариант</span>

  <!-- data-orientation — направление компонента -->
  <div data-orientation="vertical" class="separator">
    <!-- data-swipe-direction — направление свайпа в Toast -->
    <li data-swipe="move" data-swipe-direction="right" class="toast"></li>
  </div>
</div>
```

#### Использование в CSS / SCSS

**Паттерн 1 — анимации открытия/закрытия (самый частый):**

```scss
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes fade-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
@keyframes zoom-in {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
@keyframes zoom-out {
  from {
    transform: scale(1);
    opacity: 1;
  }
  to {
    transform: scale(0.95);
    opacity: 0;
  }
}
@keyframes slide-down {
  from {
    transform: translateY(-4px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
@keyframes slide-up {
  from {
    transform: translateY(4px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

// Dialog overlay — затемнение фона
.dialog-overlay {
  &[data-state='open'] {
    animation: fade-in 150ms ease;
  }
  &[data-state='closed'] {
    animation: fade-out 150ms ease;
  }
}

// Dialog content — само окно
.dialog-content {
  &[data-state='open'] {
    animation: zoom-in 150ms ease;
  }
  &[data-state='closed'] {
    animation: zoom-out 100ms ease;
  }
}

// Dropdown/Popover — появление снизу/сверху в зависимости от data-side
.dropdown {
  &[data-state='open'] {
    &[data-side='bottom'] {
      animation: slide-down 150ms ease;
    }
    &[data-side='top'] {
      animation: slide-up 150ms ease;
    }
  }
  &[data-state='closed'] {
    animation: fade-out 100ms ease;
  }
}
```

**Паттерн 2 — Accordion с CSS Variable от Radix:**

```scss
// Radix сам вычисляет высоту контента и кладёт в CSS Variable
// --radix-accordion-content-height — доступна на .accordion__content
@keyframes accordion-open {
  from {
    height: 0;
  }
  to {
    height: var(--radix-accordion-content-height);
  }
}
@keyframes accordion-close {
  from {
    height: var(--radix-accordion-content-height);
  }
  to {
    height: 0;
  }
}

.accordion__content {
  overflow: hidden;
  &[data-state='open'] {
    animation: accordion-open 200ms ease;
  }
  &[data-state='closed'] {
    animation: accordion-close 200ms ease;
  }
}

// Иконка поворачивается через data-state родителя
.accordion__icon {
  transition: transform 200ms ease;
  [data-state='open'] & {
    transform: rotate(180deg);
  }
  //  ↑ «когда любой предок имеет data-state=open»
}
```

**Паттерн 3 — Switch, Checkbox, Tabs (без анимации, просто стили):**

```scss
.switch {
  background: var(--color-border);
  transition: background var(--transition);

  &[data-state='checked'] {
    background: var(--color-primary);
  }
}

.switch__thumb {
  transform: translateX(0);
  transition: transform var(--transition);

  [data-state='checked'] & {
    transform: translateX(20px);
  }
}

// Tabs — активная вкладка
.tabs__trigger {
  color: var(--color-text-muted);
  border-bottom: 2px solid transparent;
  transition: all var(--transition);

  &[data-state='active'] {
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
  }
}

// Checkbox — состояние indeterminate (частичный выбор)
.checkbox {
  &[data-state='checked'] {
    background: var(--color-primary);
  }
  &[data-state='indeterminate'] {
    background: var(--color-primary);
    opacity: 0.5;
  }
  &[data-state='unchecked'] {
    background: transparent;
  }
}
```

**Паттерн 4 — data-disabled и data-highlighted:**

```scss
.dropdown__item {
  padding: 0.5rem 0.75rem;
  border-radius: var(--border-radius-sm);
  cursor: pointer;

  // Ховер/фокус через клавиатуру — Radix управляет этим атрибутом
  &[data-highlighted] {
    background: var(--color-surface-elevated);
    outline: none; // убираем стандартный outline — data-highlighted его заменяет
  }

  // Задизейбленный пункт
  &[data-disabled] {
    opacity: 0.4;
    pointer-events: none;
    cursor: not-allowed;
  }
}

// Select — placeholder
.select__value {
  &[data-placeholder] {
    color: var(--color-text-muted);
  }
}
```

**Паттерн 5 — data-side для позиционирования стрелки:**

```scss
// Tooltip со стрелкой, которая меняет направление автоматически
.tooltip {
  background: #1f2937;
  color: white;
  padding: 0.375rem 0.625rem;
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm);

  &[data-side='bottom'] .tooltip__arrow {
    top: -4px;
  }
  &[data-side='top'] .tooltip__arrow {
    bottom: -4px;
    transform: rotate(180deg);
  }
  &[data-side='left'] .tooltip__arrow {
    right: -4px;
    transform: rotate(90deg);
  }
  &[data-side='right'] .tooltip__arrow {
    left: -4px;
    transform: rotate(-90deg);
  }
}
```

#### CSS Variables, которые Radix инжектит автоматически

Помимо `data-*` атрибутов, Radix прокидывает CSS Variables на элементы:

| CSS Variable                                     | Компонент            | Что содержит                          |
| ------------------------------------------------ | -------------------- | ------------------------------------- |
| `--radix-accordion-content-height`               | Accordion.Content    | Полная высота контента (для анимации) |
| `--radix-accordion-content-width`                | Accordion.Content    | Полная ширина                         |
| `--radix-collapsible-content-height`             | Collapsible.Content  | То же для Collapsible                 |
| `--radix-dropdown-menu-content-available-height` | DropdownMenu.Content | Доступная высота viewport             |
| `--radix-dropdown-menu-content-available-width`  | DropdownMenu.Content | Доступная ширина                      |
| `--radix-dropdown-menu-trigger-height`           | DropdownMenu.Content | Высота кнопки-триггера                |
| `--radix-dropdown-menu-trigger-width`            | DropdownMenu.Content | Ширина кнопки-триггера                |
| `--radix-select-content-available-height`        | Select.Content       | Доступная высота                      |
| `--radix-tooltip-content-available-height`       | Tooltip.Content      | Доступная высота                      |

```scss
// Пример: Select.Content той же ширины что и Trigger
.select__content {
  width: var(--radix-select-trigger-width); // точно совпадёт с шириной кнопки
  max-height: var(--radix-select-content-available-height);
}

// DropdownMenu не шире триггера
.dropdown {
  min-width: var(--radix-dropdown-menu-trigger-width);
}
```

#### Чтение data-атрибутов из React (если нужно)

Обычно data-атрибуты нужны только CSS. Но иногда нужно читать их в JS:

```tsx
// Через ref
const ref = useRef<HTMLButtonElement>(null);
const isOpen = ref.current?.dataset.state === 'open';

// Через onAnimationEnd — запустить код после закрытия
<Dialog.Content
  onAnimationEnd={(e) => {
    if (e.currentTarget.dataset.state === 'closed') {
      // анимация закрытия завершилась
      cleanup();
    }
  }}
>
```

### Интеграция с react-table

Radix + react-table — идеальная пара: table даёт логику, Radix — UI для вспомогательных элементов:

```tsx
// DropdownMenu для фильтрации колонки
<DropdownMenu.Root>
  <DropdownMenu.Trigger asChild>
    <button>{header.column.columnDef.header as string} ▼</button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item onSelect={() => header.column.toggleSorting(false)}>
      ↑ По возрастанию
    </DropdownMenu.Item>
    <DropdownMenu.Item onSelect={() => header.column.toggleSorting(true)}>
      ↓ По убыванию
    </DropdownMenu.Item>
    <DropdownMenu.Item onSelect={() => header.column.clearSorting()}>Сбросить</DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
```

### Плюсы / Минусы

| +                                                      | -                                    |
| ------------------------------------------------------ | ------------------------------------ |
| Доступность из коробки (ARIA, клавиатура, фокус)       | Compound API поначалу непривычен     |
| Полная свобода стилизации — ваш CSS, ваши классы       | Нет готовых стилей — всё пишете сами |
| Tree-shakeable — платите только за то, что используете | Много мелких пакетов вместо одного   |
| `asChild` — никаких лишних DOM-элементов               | —                                    |
| `data-state` — анимации чистым CSS без JS              | —                                    |

---

## 11. Sonner

**Что это:** Toast-уведомления. < 2 KB gzip. Красивые анимации из коробки.

### Настройка

```tsx
// src/app/providers/index.tsx — один раз в корне приложения
import { Toaster } from 'sonner';

<Toaster
  richColors // цветные иконки для типов
  position="bottom-right" // позиция
  duration={4000} // время показа (мс)
  closeButton // кнопка закрытия
/>;
```

### Использование

```tsx
import { toast } from 'sonner';

// Типы уведомлений
toast('Просто сообщение');
toast.success('Успешно сохранено!');
toast.error('Произошла ошибка');
toast.warning('Проверьте данные');
toast.info('Новое обновление доступно');

// С описанием
toast.success('Пост создан!', {
  description: 'Заголовок: Мой новый пост',
});

// Promise — автоматически меняет состояние
toast.promise(saveData(), {
  loading: 'Сохраняем...',
  success: 'Сохранено!',
  error: (err) => `Ошибка: ${err.message}`,
});

// С action-кнопкой
toast('Файл удалён', {
  action: {
    label: 'Отменить',
    onClick: () => restoreFile(),
  },
});

// Кастомная длительность
toast.error('Критическая ошибка', { duration: Infinity }); // не исчезает

// Dismiss программно
const id = toast.loading('Загружаем...');
// ... позже:
toast.dismiss(id);
```

---

## 12. date-fns

**Что это:** Утилиты для работы с датами. Tree-shakeable — в бандл попадают только используемые функции.

```tsx
import { format, formatDistanceToNow, addDays, isAfter, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

const date = new Date();

// Форматирование
format(date, 'dd.MM.yyyy'); // '28.03.2026'
format(date, 'd MMMM yyyy, HH:mm', { locale: ru }); // '28 марта 2026, 14:30'
format(date, 'EEEE', { locale: ru }); // 'суббота'

// Относительное время
formatDistanceToNow(date, { locale: ru, addSuffix: true }); // '5 минут назад'

// Манипуляции
const tomorrow = addDays(date, 1);
const nextWeek = addWeeks(date, 1);
const startOfCurrentMonth = startOfMonth(date);

// Сравнение
isAfter(tomorrow, date); // true
isBefore(date, tomorrow); // true
isToday(date); // true

// Парсинг ISO-строки от API
const apiDate = parseISO('2026-03-28T14:30:00Z');
format(apiDate, 'dd.MM.yyyy', { locale: ru });

// Паттерны формата:
// d — день без нуля     dd — день с нулём
// M — месяц цифрой     MM — с нулём     MMM — 'мар'     MMMM — 'март'
// yyyy — год           yy — 2 цифры года
// HH — часы 24ч       mm — минуты      ss — секунды
// EEEE — день недели полный
```

---

## 13. i18next + react-i18next

**Что это:** Интернационализация (i18n) — перевод текстов на разные языки.

### Структура файлов в проекте

```
src/shared/lib/i18n/
├── index.ts          # инициализация i18next
├── i18n.d.ts         # TypeScript — тип-проверка ключей
└── locales/
    ├── ru.json       # русские переводы
    └── en.json       # английские переводы
```

### Файлы переводов

```json
// src/shared/lib/i18n/locales/ru.json
{
  "common": {
    "loading": "Загрузка...",
    "error": "Произошла ошибка"
  },
  "demo": {
    "counter": {
      "heading": "Клиентское состояние",
      "increment": "Увеличить",
      "value": "Счётчик: {{count}}"
    }
  }
}
```

### Инициализация

```ts
// src/shared/lib/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './locales/ru.json';
import en from './locales/en.json';

// Определяем язык: localStorage → браузер → 'ru'
const STORAGE_KEY = 'app-language';
const saved = localStorage.getItem(STORAGE_KEY);
const browserLang = navigator.language.split('-')[0];
const supported = ['ru', 'en'];
const lng = supported.includes(saved ?? '')
  ? saved!
  : supported.includes(browserLang)
    ? browserLang
    : 'ru';

void i18n.use(initReactI18next).init({
  resources: { ru: { translation: ru }, en: { translation: en } },
  lng,
  fallbackLng: 'ru',
  interpolation: { escapeValue: false }, // React сам экранирует XSS
});

export const setLanguage = (lang: 'ru' | 'en') => {
  localStorage.setItem(STORAGE_KEY, lang);
  void i18n.changeLanguage(lang);
};
```

```ts
// src/app/main.tsx — импорт ПЕРЕД рендером!
import '@/shared/lib/i18n'; // side-effect импорт
```

### TypeScript type-safety

```ts
// src/shared/lib/i18n/i18n.d.ts
import type ru from './locales/ru.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof ru };
  }
}
// Теперь t('несуществующий.ключ') → ошибка TypeScript
// И автодополнение в IDE через Ctrl+Space
```

### Использование в компонентах

```tsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t, i18n } = useTranslation();

  return (
    <div>
      {/* Простой ключ */}
      <h1>{t('demo.counter.heading')}</h1>

      {/* Интерполяция переменных */}
      <p>{t('demo.counter.value', { count: 42 })}</p>
      {/* Результат: 'Счётчик: 42' */}

      {/* JSX в переводе — компонент Trans */}
      <Trans i18nKey="demo.greeting">
        Привет, <strong>{{ name: 'Мир' }}</strong>!
      </Trans>

      {/* Переключение языка */}
      <button onClick={() => setLanguage('en')}>English</button>
      <button onClick={() => setLanguage('ru')}>Русский</button>

      {/* Текущий язык */}
      <span>{i18n.language}</span>
    </div>
  );
};
```

### Плюсы / Минусы

| +                                 | -                                   |
| --------------------------------- | ----------------------------------- |
| Type-safe ключи с автодополнением | Первичная настройка занимает время  |
| Детекция языка, fallback          | Вложенные ключи поначалу непривычны |
| Поддержка плюрализации, форматов  | —                                   |

---

## 14. nuqs

**Что это:** `useState` для URL query-параметров. Состояние живёт в URL — работает кнопка назад, можно поделиться ссылкой.

**Когда использовать:** Фильтры, поиск, пагинация, вкладки — всё, что должно отражаться в URL.

### Базовое использование

```tsx
import { useQueryState, parseAsInteger, parseAsString, parseAsBoolean } from 'nuqs';

const SearchPage = () => {
  // Тип автоматически из парсера: string | null
  const [search, setSearch] = useQueryState('q');

  // С парсером типа
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
  const [sort, setSort] = useQueryState('sort', parseAsString.withDefault('date'));
  const [showArchived, setShowArchived] = useQueryState(
    'archived',
    parseAsBoolean.withDefault(false),
  );

  return (
    <>
      <input
        value={search ?? ''}
        onChange={(e) => setSearch(e.target.value || null)} // null убирает параметр из URL
        placeholder="Поиск..."
      />

      <select value={sort} onChange={(e) => setSort(e.target.value)}>
        <option value="date">По дате</option>
        <option value="name">По имени</option>
      </select>

      <Pagination current={page} onChange={setPage} />
    </>
  );
};
// URL становится: /search?q=react&page=2&sort=name
```

### Несколько параметров сразу

```tsx
import { useQueryStates } from 'nuqs';

const [filters, setFilters] = useQueryStates({
  page: parseAsInteger.withDefault(1),
  sort: parseAsString.withDefault('date'),
  category: parseAsString,
});

// Обновить несколько параметров атомарно
setFilters({ page: 1, category: 'tech' });
```

### Плюсы / Минусы

| +                                             | -                                          |
| --------------------------------------------- | ------------------------------------------ |
| Работает кнопка назад/вперёд браузера         | Добавляет зависимость для простых случаев  |
| Ссылки можно отправлять — состояние сохранено | Сериализация сложных объектов нетривиальна |
| Заменяет useState для фильтров/поиска         | —                                          |

---

## 15. @tanstack/react-table

**Что это:** **Headless** (без UI) библиотека для таблиц. Даёт логику (сортировка, фильтрация, пагинация, группировка) — вы рендерите HTML сами.

**Когда использовать:** Любая таблица с сортировкой, фильтрацией или пагинацией.

### Базовая таблица

```tsx
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import type { SortingState } from '@tanstack/react-table';

interface Post {
  id: number;
  title: string;
  userId: number;
}

const columnHelper = createColumnHelper<Post>();

const columns = [
  columnHelper.accessor('id', {
    header: '№',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('title', {
    header: 'Заголовок',
    cell: (info) => info.getValue(),
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Действия',
    cell: ({ row }) => <button onClick={() => deletePost(row.original.id)}>Удалить</button>,
  }),
];

const PostsTable = ({ data }: { data: Post[] }) => {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(), // включаем сортировку
  });

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th
                key={header.id}
                onClick={header.column.getToggleSortingHandler()}
                style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
                {header.column.getIsSorted() === 'asc' ? ' ↑' : ''}
                {header.column.getIsSorted() === 'desc' ? ' ↓' : ''}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

### С фильтрацией и пагинацией

```tsx
import {
  getFilteredRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table';

const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  initialState: { pagination: { pageSize: 20 } },
});

// Глобальный поиск
<input
  value={table.getState().globalFilter ?? ''}
  onChange={(e) => table.setGlobalFilter(e.target.value)}
/>

// Пагинация
<button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>←</button>
<span>{table.getState().pagination.pageIndex + 1} / {table.getPageCount()}</span>
<button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>→</button>
```

### Плюсы / Минусы

| +                                  | -                                     |
| ---------------------------------- | ------------------------------------- |
| Полный контроль над HTML/CSS       | Много бойлерплейта для базовых таблиц |
| Совместим с любой UI-библиотекой   | Крутой порог входа                    |
| Очень гибкая сортировка/фильтрация | —                                     |

---

## 16. @tanstack/react-virtual

**Что это:** Виртуализация — рендерит только **видимые** элементы в viewport. 10 000 строк без лага.

**Когда использовать:** Списки или таблицы с сотнями и тысячами элементов.

### Виртуальный список

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

const VirtualList = ({ items }: { items: string[] }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length, // общее количество элементов
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // примерная высота элемента (px)
    overscan: 5, // рендерить N элементов сверх видимых
  });

  return (
    // Контейнер со скроллом — ОБЯЗАТЕЛЕН фиксированная высота
    <div ref={parentRef} style={{ height: '500px', overflow: 'auto' }}>
      {/* Внутренний контейнер — высота = суммарная высота всех элементов */}
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {items[virtualItem.index]}
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Виртуальная таблица (с react-table)

```tsx
// Комбинация react-table + react-virtual
const rowVirtualizer = useVirtualizer({
  count: table.getRowModel().rows.length,
  getScrollElement: () => tableContainerRef.current,
  estimateSize: () => 40,
});

<tbody style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
    const row = rows[virtualRow.index];
    return (
      <tr
        key={row.id}
        style={{
          position: 'absolute',
          transform: `translateY(${virtualRow.start}px)`,
        }}
      >
        {row.getVisibleCells().map((cell) => (
          <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
        ))}
      </tr>
    );
  })}
</tbody>;
```

### Плюсы / Минусы

| +                                               | -                                       |
| ----------------------------------------------- | --------------------------------------- |
| Константное время рендера независимо от размера | Требует фиксированной высоты контейнера |
| Плавный скролл даже на 100k элементов           | Анимации элементов сложнее              |
| Поддерживает горизонтальный скролл              | —                                       |

---

## 17. react-error-boundary

**Что это:** Error Boundary как переиспользуемый компонент + хуки. Ловит ошибки рендера и показывает fallback UI.

**Проблема без него:** Если в компоненте бросается исключение — React размонтирует всё дерево и показывает белый экран.

### Базовое использование

```tsx
import { ErrorBoundary } from 'react-error-boundary';

// Простейший fallback
<ErrorBoundary fallback={<div>Что-то пошло не так</div>}>
  <ProblematicComponent />
</ErrorBoundary>;

// Компонент fallback с деталями ошибки и кнопкой "попробовать снова"
const ErrorFallback = ({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) => (
  <div role="alert" className="error-boundary">
    <h2>Произошла ошибка</h2>
    <pre>{error.message}</pre>
    <button onClick={resetErrorBoundary}>Попробовать снова</button>
  </div>
);

<ErrorBoundary
  FallbackComponent={ErrorFallback}
  onError={(error, info) => {
    // Логирование в Sentry или другой сервис
    console.error('Ошибка рендера:', error, info.componentStack);
  }}
  onReset={() => {
    // Очистить состояние перед повторной попыткой
    queryClient.clear();
  }}
>
  <MyApp />
</ErrorBoundary>;
```

### useErrorBoundary — программный выброс

```tsx
import { useErrorBoundary } from 'react-error-boundary';

const DataComponent = () => {
  const { showBoundary } = useErrorBoundary();

  const handleAsync = async () => {
    try {
      await fetchData();
    } catch (error) {
      // Передаём async-ошибку в ближайший ErrorBoundary
      showBoundary(error);
    }
  };
  // ...
};
```

### withErrorBoundary HOC

```tsx
import { withErrorBoundary } from 'react-error-boundary';

const SafeComponent = withErrorBoundary(DangerousComponent, {
  FallbackComponent: ErrorFallback,
});
```

### Рекомендуемая структура

```tsx
// Несколько уровней границ — изолируем сбои
<ErrorBoundary FallbackComponent={AppErrorFallback}>
  {' '}
  {/* Глобальная */}
  <Layout>
    <ErrorBoundary FallbackComponent={PageErrorFallback}>
      {' '}
      {/* На страницу */}
      <Routes>
        <Route
          path="/posts"
          element={
            <ErrorBoundary FallbackComponent={WidgetErrorFallback}>
              {' '}
              {/* Виджет */}
              <PostsWidget />
            </ErrorBoundary>
          }
        />
      </Routes>
    </ErrorBoundary>
  </Layout>
</ErrorBoundary>
```

---

## 18. @dnd-kit/core + @dnd-kit/sortable

**Что это:** Модульная Drag & Drop библиотека. Доступная (ARIA, клавиатура), touch-friendly.

### Сортируемый список

```tsx
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';

// Один сортируемый элемент
const SortableItem = ({ id, title }: { id: number; title: string }) => {
  const {
    attributes, // aria-атрибуты доступности
    listeners, // обработчики событий мыши/тача/клавиатуры
    setNodeRef, // ref для DOM-элемента
    transform, // CSS transform во время перетаскивания
    transition, // CSS transition
    isDragging, // флаг: элемент сейчас тащат?
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {title}
    </li>
  );
};

// Список с DnD
const SortableList = () => {
  const [items, setItems] = useState([
    { id: 1, title: 'Первый' },
    { id: 2, title: 'Второй' },
    { id: 3, title: 'Третий' },
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((i) => i.id === active.id);
        const newIndex = prev.findIndex((i) => i.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul>
          {items.map((item) => (
            <SortableItem key={item.id} {...item} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
};
```

### DragOverlay — элемент под курсором

```tsx
import { DragOverlay } from '@dnd-kit/core';

// Рендерит красивый "призрак" под курсором во время перетаскивания
<DragOverlay>{activeId ? <ItemPreview id={activeId} /> : null}</DragOverlay>;
```

---

## 19. MSW (Mock Service Worker)

**Что это:** Перехват HTTP-запросов на уровне Service Worker. Моки работают в браузере и в тестах с одним и тем же кодом.

### Настройка хэндлеров

```ts
// src/shared/api/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // GET /posts — список постов
  http.get('*/posts', () =>
    HttpResponse.json([{ id: 1, title: 'Тестовый пост', body: 'Тело поста', userId: 1 }]),
  ),

  // POST /posts — создание поста
  http.post('*/posts', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 101, ...(body as object) }, { status: 201 });
  }),

  // Симуляция ошибки
  http.get('*/posts/999', () => HttpResponse.json({ message: 'Not found' }, { status: 404 })),

  // Задержка для тестирования loading-состояний
  http.get('*/slow-endpoint', async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return HttpResponse.json({ data: '...' });
  }),
];
```

```ts
// src/shared/api/mocks/server.ts — для Node (тесты Vitest)
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
export const server = setupServer(...handlers);

// src/shared/api/mocks/browser.ts — для браузера (dev-режим)
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
export const worker = setupWorker(...handlers);
```

```ts
// src/tests/setup.ts — подключение MSW к Vitest
import { server } from '@/shared/api/mocks/server';
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers()); // сбрасываем переопределения
afterAll(() => server.close());
```

### Переопределение в конкретном тесте

```tsx
import { server } from '@/shared/api/mocks/server';
import { http, HttpResponse } from 'msw';

test('показывает ошибку при сбое API', async () => {
  server.use(
    http.get('*/posts', () => HttpResponse.json({ message: 'Server error' }, { status: 500 })),
  );
  // ... тест
});
```

---

## 20. Vitest + React Testing Library

**Что это:** Vitest — быстрый тестраннер (работает в том же Vite-окружении). RTL — тестирование компонентов через взаимодействие пользователя.

**Главный принцип RTL:** Тесты должны имитировать то, что делает пользователь, а не детали реализации.

### Настройка

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom', // браузерная среда
    setupFiles: ['./src/tests/setup.ts'],
    globals: true, // не нужно импортировать describe, test, expect
  },
  resolve: {
    alias: { '@': '/src' },
  },
});
```

```tsx
// src/tests/setup.ts
import '@testing-library/jest-dom'; // доп. матчеры: toBeInTheDocument, etc.
import { server } from '@/shared/api/mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Базовый тест компонента

```tsx
// src/widgets/DemoWidget/__tests__/DemoWidget.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DemoWidget } from '../ui';

// Обёртка с провайдерами
const renderWithProviders = (ui: React.ReactElement) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

describe('DemoWidget', () => {
  test('счётчик начинается с 0 и увеличивается', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DemoWidget />);

    expect(screen.getByTestId('counter-value')).toHaveTextContent('0');

    await user.click(screen.getByRole('button', { name: 'Увеличить' }));
    expect(screen.getByTestId('counter-value')).toHaveTextContent('1');
  });

  test('показывает ошибку валидации при пустой отправке', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DemoWidget />);

    await user.click(screen.getByRole('button', { name: /создать пост/i }));
    expect(await screen.findByText('Минимум 5 символов')).toBeInTheDocument();
  });

  test('посты загружаются из API', async () => {
    renderWithProviders(<DemoWidget />);
    // waitFor или findBy — ждут асинхронного появления элемента
    expect(await screen.findByRole('list', { name: 'Список постов' })).toBeInTheDocument();
  });
});
```

### Ключевые методы RTL

```tsx
// Запросы (queries) — приоритет: getByRole > getByLabelText > getByText > getByTestId
screen.getByRole('button', { name: /отправить/i }); // синхронный — бросает если нет
screen.queryByText('Ошибка'); // возвращает null если нет
await screen.findByText('Загружено'); // асинхронный — ждёт появления

// Матчеры
expect(element).toBeInTheDocument();
expect(element).toBeVisible();
expect(element).toHaveTextContent('текст');
expect(element).toHaveValue('значение');
expect(element).toBeDisabled();
expect(element).toHaveClass('btn--active');
expect(element).toHaveAttribute('aria-label', 'закрыть');

// userEvent — имитация действий пользователя
const user = userEvent.setup();
await user.click(button);
await user.type(input, 'текст');
await user.clear(input);
await user.selectOptions(select, ['option1']);
await user.keyboard('{Enter}');
```

### Плюсы / Минусы

| +                                            | -                                         |
| -------------------------------------------- | ----------------------------------------- |
| Быстрее Jest в 2-10x                         | Настройка сложнее чем Jest из коробки     |
| То же окружение что и Vite — нет рассинхрона | jsdom не полный браузер (нет layout, CSS) |
| Тесты через accessibility — более устойчивы  | —                                         |

---

## 21. Playwright

**Что это:** E2E-тестирование в реальных браузерах (Chromium, Firefox, WebKit). Тестирует приложение целиком.

### Настройка

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry', // запись трейса при падении теста
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  // Автоматически запускает dev-сервер перед тестами
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !Boolean(process.env.CI),
  },
});
```

### Базовый E2E-тест

```ts
// tests/e2e/demo.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Страница Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo');
  });

  test('счётчик увеличивается', async ({ page }) => {
    const counter = page.getByTestId('counter-value');
    await expect(counter).toHaveText('0');

    await page.getByRole('button', { name: 'Увеличить' }).click();
    await expect(counter).toHaveText('1');
  });

  test('форма валидирует поля', async ({ page }) => {
    await page.getByRole('button', { name: /создать пост/i }).click();
    await expect(page.getByText('Минимум 5 символов')).toBeVisible();
  });

  test('форма очищается после успешной отправки', async ({ page }) => {
    await page.locator('.demo-widget__item').first().waitFor({ timeout: 10_000 });

    await page.getByLabel('Заголовок').fill('Тестовый заголовок');
    await page.getByLabel('Текст поста').fill('Достаточно длинный текст поста');
    await page.getByRole('button', { name: /создать пост/i }).click();

    await expect(page.getByLabel('Заголовок')).toHaveValue('', { timeout: 5_000 });
  });
});
```

### Полезные методы

```ts
// Локаторы
page.getByRole('button', { name: /текст/i });
page.getByLabel('Email');
page.getByTestId('submit-btn');
page.getByText('Заголовок', { exact: true });
page.locator('.css-class');
page.locator('form').getByRole('button'); // цепочка локаторов

// Ожидания
await expect(locator).toBeVisible();
await expect(locator).toHaveText('текст');
await expect(locator).toHaveURL('/demo');
await expect(locator).toBeDisabled();

// Действия
await page.goto('/demo');
await locator.click();
await locator.fill('текст');
await locator.selectOption('value');
await page.keyboard.press('Escape');

// Снимок экрана при падении (автоматически)
// Видео записи через trace
await page.screenshot({ path: 'screenshot.png' });
```

### Запуск

```bash
npm run test:e2e          # headless в терминале
npm run test:e2e:ui       # UI-режим — видно что происходит в браузере
npx playwright show-report  # HTML-отчёт с деталями
```

---

## 22. Конфиги проекта

### TypeScript — три уровня конфигурации

```
tsconfig.json        ← корень, объединяет все
tsconfig.app.json    ← src/** — браузерный контекст
tsconfig.node.json   ← vite.config.ts и др. — Node.js контекст
tsconfig.eslint.json ← только для ESLint (src/ + tests/)
```

**Зачем два tsconfig?** Vite, Vitest, Playwright работают в Node.js — им нужны Node-типы. Код приложения работает в браузере — ему нужны DOM-типы. Смешивать их нельзя.

```json
// tsconfig.app.json — ключевые настройки
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true, // обязательно!
    "noUnusedLocals": true, // нет неиспользуемых переменных
    "noUnusedParameters": true, // нет неиспользуемых параметров
    "paths": { "@/*": ["./src/*"] } // алиас @/ → src/
  }
}
```

### ESLint — flat config (v9)

```js
// eslint.config.js — ключевая структура
export default [
  // 1. Общие правила для TypeScript + React (src/ и tests/)
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { parserOptions: { project: './tsconfig.eslint.json' } },
    // ... rules
  },

  // 2. Отдельный блок для конфигов (Node.js контекст)
  {
    files: ['vite.config.ts', 'vitest.config.ts', 'playwright.config.ts'],
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: { project: './tsconfig.node.json' }, // Node tsconfig!
    },
  },
];
```

**Почему конфиги в отдельном блоке?** Они в `tsconfig.node.json`, не в `tsconfig.eslint.json`. Если ESLint пытается анализировать их с браузерным tsconfig — parsing error.

### Vite — ключевые настройки

```ts
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(__dirname, './src') }, // алиас @/
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'zustand-vendor': ['zustand'],
        },
      },
    },
  },
});
```

**manualChunks** — явное разбиение на чанки. Браузер кэширует vendor-чанки отдельно от кода приложения. Обновление кода приложения не инвалидирует кэш React/React Router.

### Prettier

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "printWidth": 100,
  "trailingComma": "all"
}
```

### Husky + lint-staged

```json
// package.json — запускать при git commit
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,css,scss}": ["prettier --write"]
}
```

```bash
# .husky/pre-commit — запускается перед каждым коммитом
npx lint-staged
```

Если линтер находит ошибки, которые нельзя автоисправить — коммит отклоняется.

### Переменные окружения

```
.env.development    ← npm run dev
.env.production     ← npm run build
.env.example        ← шаблон (коммитится в git)
.env                ← локальные переопределения (в .gitignore)
```

```ts
// Все переменные проходят валидацию через Zod при старте
// src/shared/config/env.ts
export const env = envSchema.parse(import.meta.env);

// Использование:
import { env } from '@/shared/config/env';
fetch(env.VITE_API_URL + '/posts');
```

---

## 23. useTheme — тёмная тема

**Что это:** Встроенный хук шаблона для управления темой приложения. Хранит выбор пользователя в `localStorage`, поддерживает системную тему и применяет `data-theme` на `<html>`.

**Файл:** `src/shared/lib/theme`

### Режимы темы

| Режим      | Поведение                                                         |
| ---------- | ----------------------------------------------------------------- |
| `'light'`  | Всегда светлая                                                    |
| `'dark'`   | Всегда тёмная                                                     |
| `'system'` | Следует системной настройке (`prefers-color-scheme`) — **дефолт** |

### Базовое использование

```tsx
import { useTheme } from '@/shared/lib/theme';

const ThemeToggle = () => {
  const { resolvedTheme, toggle } = useTheme();

  return <button onClick={toggle}>{resolvedTheme === 'dark' ? '☀️ Светлая' : '🌙 Тёмная'}</button>;
};
```

### Полный API

```tsx
const {
  mode, // 'light' | 'dark' | 'system' — что выбрал пользователь
  resolvedTheme, // 'light' | 'dark' — фактическая тема (с учётом system)
  toggle, // переключает между light ↔ dark
  setMode, // установить конкретный режим
} = useTheme();
```

### Примеры

```tsx
// Переключатель с тремя режимами
const { mode, setMode } = useTheme();

<select value={mode} onChange={(e) => setMode(e.target.value as ThemeMode)}>
  <option value="system">Системная</option>
  <option value="light">Светлая</option>
  <option value="dark">Тёмная</option>
</select>;
```

```tsx
// Показать иконку под текущую тему
import { Moon, Sun } from 'lucide-react';
const { resolvedTheme } = useTheme();

{
  resolvedTheme === 'dark' ? <Moon size={18} /> : <Sun size={18} />;
}
```

```tsx
// Разная логика в зависимости от темы
const { resolvedTheme } = useTheme();
const chartColors =
  resolvedTheme === 'dark'
    ? { bg: '#1a1a2e', line: '#e94560' }
    : { bg: '#ffffff', line: '#2563eb' };
```

### Как работает под капотом

1. Состояние `mode` хранится в `localStorage` через `createPersistedStore`
2. При монтировании и каждом изменении `mode` → применяется `data-theme` на `document.documentElement`
3. При `mode === 'system'` — подписывается на `MediaQueryList` изменения и обновляет атрибут автоматически
4. CSS-переменные в `index.css` переопределяются через `[data-theme='dark']` — никакого JS в стилях

### CSS-переменные темы

Все цвета уже адаптированы. Используй семантические токены, а не сырые цвета:

```css
/* ✅ Правильно — адаптируется автоматически */
.card {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

/* ❌ Неправильно — жёстко зафиксирован цвет */
.card {
  background: #ffffff;
  color: #101828;
}
```

Доступные семантические токены:

| Токен                | Светлая    | Тёмная     |
| -------------------- | ---------- | ---------- |
| `--color-bg`         | `#ffffff`  | `#0b0f14`  |
| `--color-surface`    | `#fcfcfd`  | `#0f141b`  |
| `--color-surface-2`  | `#f9fafb`  | `#121922`  |
| `--color-text`       | `#101828`  | `#e6e9ef`  |
| `--color-text-muted` | `#475467`  | `#a8b0bc`  |
| `--color-border`     | `#e4e7ec`  | `#273244`  |
| `--color-primary`    | orange-500 | orange-400 |

---

## 24. useMediaQuery — адаптив

**Что это:** Встроенный хук шаблона для отслеживания CSS media queries в JS. Реагирует на изменения размера окна в реальном времени.

**Файл:** `src/shared/lib/use-media-query.ts`

### Когда использовать хук, а когда CSS

Это ключевой вопрос. Правило простое:

| Сценарий                                           | Инструмент          |
| -------------------------------------------------- | ------------------- |
| Изменить отступы, размеры, цвета                   | **CSS media query** |
| Скрыть/показать элемент через `display: none`      | **CSS media query** |
| Рендерить **разные компоненты** под разные экраны  | **`useMediaQuery`** |
| Условная **логика** (разное поведение)             | **`useMediaQuery`** |
| Передать брейкпоинт в JS-библиотеку (чарты, карты) | **`useMediaQuery`** |

### Брейкпоинты

```ts
import { breakpoints } from '@/shared/lib/use-media-query';

// Mobile-first, min-width:
breakpoints.xs; // >= 480px   — большие телефоны
breakpoints.sm; // >= 640px   — маленькие планшеты
breakpoints.md; // >= 768px   — планшеты
breakpoints.lg; // >= 1024px  — ноутбуки
breakpoints.xl; // >= 1280px  — десктоп
breakpoints['2xl']; // >= 1536px — широкий десктоп
// base (нет query) — всё от 0px, включая телефоны 300-479px
```

### Базовое использование

```tsx
import { useMediaQuery, breakpoints } from '@/shared/lib/use-media-query';

const Navbar = () => {
  const isDesktop = useMediaQuery(breakpoints.lg);

  return isDesktop ? <DesktopNav /> : <MobileNav />;
};
```

### Примеры

```tsx
// Адаптивный Grid — количество колонок из JS
const isTablet = useMediaQuery(breakpoints.md);
const isDesktop = useMediaQuery(breakpoints.xl);

const columns = isDesktop ? 4 : isTablet ? 2 : 1;

<VirtualGrid columns={columns} ... />
```

```tsx
// Мобильное bottom sheet vs десктопный sidebar
const isMobile = !useMediaQuery(breakpoints.md);

{
  isMobile ? (
    <BottomSheet open={open}>
      <Filters />
    </BottomSheet>
  ) : (
    <Sidebar>
      <Filters />
    </Sidebar>
  );
}
```

```tsx
// Произвольный media query
const isLandscape = useMediaQuery('(orientation: landscape)');
const isRetina = useMediaQuery('(min-resolution: 2dppx)');
const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
```

```tsx
// Не дублируй хук с одинаковым query — вынеси в переменную вверху компонента
const isDesktop = useMediaQuery(breakpoints.lg);

// Потом используй isDesktop сколько угодно раз
<header className={isDesktop ? styles.headerDesktop : styles.headerMobile}>
  {isDesktop && <SearchBar />}
  ...
</header>;
```

### Mobile-first в CSS (без хука)

Для большинства задач хук не нужен — пиши стили снизу вверх:

```css
.container {
  /* база = мобилка (0px и выше, включая 300px телефоны) */
  padding: var(--pad-sm);
  flex-direction: column;
  gap: var(--space-3);
}

@media (min-width: 768px) {
  /* планшет и выше */
  .container {
    padding: var(--pad-lg);
    flex-direction: row;
    gap: var(--space-6);
  }
}

@media (min-width: 1024px) {
  /* десктоп */
  .container {
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

### Важно: SSR / первый рендер

Хук возвращает `false` до монтирования (на сервере или при SSR). В этом шаблоне используется чистый Vite SPA — проблем нет. Но если добавить SSR (Next.js и т.п.), учитывай возможный layout shift.

---

## Быстрая шпаргалка: что использовать для какой задачи

| Задача                              | Библиотека                      |
| ----------------------------------- | ------------------------------- |
| Данные с сервера (GET/кэш)          | TanStack Query `useQuery`       |
| Изменение данных (POST/PUT/DELETE)  | TanStack Query `useMutation`    |
| UI-состояние (счётчики, модалки)    | Zustand                         |
| Формы                               | react-hook-form + zodResolver   |
| Валидация                           | Zod                             |
| Уведомления                         | Sonner `toast.*`                |
| Роутинг                             | React Router                    |
| Фильтры/поиск в URL                 | nuqs                            |
| Таблицы                             | @tanstack/react-table           |
| Длинные списки (1000+ элементов)    | @tanstack/react-virtual         |
| Модальные окна / Dropdown / Tooltip | Radix UI                        |
| Drag & Drop                         | @dnd-kit                        |
| Дата/время                          | date-fns                        |
| Переводы                            | i18next / react-i18next         |
| Иконки                              | Lucide React                    |
| Условные классы                     | clsx                            |
| HTTP-запросы                        | Axios (через apiClient)         |
| Моки API                            | MSW                             |
| Юнит-тесты                          | Vitest + RTL                    |
| E2E-тесты                           | Playwright                      |
| Error Boundary                      | react-error-boundary            |
| Тёмная/светлая тема                 | `useTheme`                      |
| Адаптив в JS (разные компоненты)    | `useMediaQuery` + `breakpoints` |

---

_Последнее обновление: 30 марта 2026_
