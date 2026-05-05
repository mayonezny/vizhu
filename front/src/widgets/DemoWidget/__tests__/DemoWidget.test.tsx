import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { DemoWidget } from '../ui';

// ─── Вспомогательные функции ──────────────────────────────────────────────────

/** Создаёт свежий QueryClient для каждого теста (предотвращает утечку кэша между тестами). */
const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

describe('DemoWidget', () => {
  let queryClient: QueryClient;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    queryClient = makeQueryClient();
    user = userEvent.setup();
  });

  // ─── Рендер ──────────────────────────────────────────────────────────────

  it('отрисовывает заголовок страницы и заголовки всех трёх карточек', () => {
    render(<DemoWidget />, { wrapper: createWrapper(queryClient) });

    expect(screen.getByText('Template Demo')).toBeInTheDocument();
    expect(screen.getByText('Клиентское состояние')).toBeInTheDocument();
    expect(screen.getByText('Серверное состояние')).toBeInTheDocument();
    expect(screen.getByText('react-hook-form + zod')).toBeInTheDocument();
  });

  // ─── Zustand: счётчик ─────────────────────────────────────────────────────

  it('счётчик начинается с 0', () => {
    render(<DemoWidget />, { wrapper: createWrapper(queryClient) });

    expect(screen.getByTestId('counter-value')).toHaveTextContent('0');
  });

  it('увеличивает счётчик при клике на +', async () => {
    render(<DemoWidget />, { wrapper: createWrapper(queryClient) });

    await user.click(screen.getByRole('button', { name: 'Увеличить' }));
    expect(screen.getByTestId('counter-value')).toHaveTextContent('1');
  });

  it('уменьшает счётчик при клике на −', async () => {
    render(<DemoWidget />, { wrapper: createWrapper(queryClient) });

    await user.click(screen.getByRole('button', { name: 'Увеличить' }));
    await user.click(screen.getByRole('button', { name: 'Увеличить' }));
    await user.click(screen.getByRole('button', { name: 'Уменьшить' }));

    expect(screen.getByTestId('counter-value')).toHaveTextContent('1');
  });

  it('сбрасывает счётчик в 0 при клике на «Сбросить»', async () => {
    render(<DemoWidget />, { wrapper: createWrapper(queryClient) });

    await user.click(screen.getByRole('button', { name: 'Увеличить' }));
    await user.click(screen.getByRole('button', { name: 'Увеличить' }));
    await user.click(screen.getByRole('button', { name: 'Сбросить' }));

    expect(screen.getByTestId('counter-value')).toHaveTextContent('0');
  });

  // ─── TanStack Query: список ───────────────────────────────────────────────

  it('показывает скелетон-загрузку пока идёт запрос', () => {
    render(<DemoWidget />, { wrapper: createWrapper(queryClient) });

    // Скелетон должен быть виден до прихода данных
    expect(screen.getByRole('list', { name: 'Загрузка постов' })).toBeInTheDocument();
  });

  it('отрисовывает посты после успешной загрузки', async () => {
    render(<DemoWidget />, { wrapper: createWrapper(queryClient) });

    // Ждём ответа MSW-мока
    await waitFor(() => {
      expect(screen.getByText('Mock Post One')).toBeInTheDocument();
    });

    expect(screen.getByText('Mock Post Two')).toBeInTheDocument();
    expect(screen.getByText('Mock Post Three')).toBeInTheDocument();
  });

  // ─── react-hook-form: валидация ───────────────────────────────────────────

  it('кнопка «Создать пост» активна по умолчанию', () => {
    render(<DemoWidget />, { wrapper: createWrapper(queryClient) });

    // react-hook-form не блокирует кнопку до первого submit — блокирует только isPending
    expect(screen.getByRole('button', { name: /создать пост/i })).toBeEnabled();
  });

  it('показывает ошибки валидации при отправке пустой формы', async () => {
    render(<DemoWidget />, { wrapper: createWrapper(queryClient) });

    await user.click(screen.getByRole('button', { name: /создать пост/i }));

    // zod-схема отклоняет пустые поля — ошибки появляются синхронно
    await waitFor(() => {
      expect(screen.getByText('Минимум 5 символов')).toBeInTheDocument();
      expect(screen.getByText('Минимум 10 символов')).toBeInTheDocument();
    });
  });

  it('показывает ошибку если заголовок слишком короткий', async () => {
    render(<DemoWidget />, { wrapper: createWrapper(queryClient) });

    await user.type(screen.getByLabelText('Заголовок'), 'abc');
    await user.click(screen.getByRole('button', { name: /создать пост/i }));

    await waitFor(() => {
      expect(screen.getByText('Минимум 5 символов')).toBeInTheDocument();
    });
  });

  it('сбрасывает форму и показывает метку времени после успешной отправки', async () => {
    render(<DemoWidget />, { wrapper: createWrapper(queryClient) });

    // Ждём загрузки постов (мутация инвалидирует список)
    await waitFor(() => screen.getByText('Mock Post One'));

    const titleInput = screen.getByLabelText('Заголовок');
    const bodyInput = screen.getByLabelText('Текст поста');

    await user.type(titleInput, 'Мой новый пост');
    await user.type(bodyInput, 'Текст поста длиннее десяти символов');
    await user.click(screen.getByRole('button', { name: /создать пост/i }));

    // После успешной мутации форма должна очиститься
    await waitFor(() => {
      expect(titleInput).toHaveValue('');
      expect(bodyInput).toHaveValue('');
    });

    // Метка времени последней отправки должна появиться
    expect(screen.getByText(/последняя отправка/i)).toBeInTheDocument();
  });
});
