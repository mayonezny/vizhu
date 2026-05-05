import { zodResolver } from '@hookform/resolvers/zod';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useShallow } from 'zustand/shallow';

import { useCreatePost, usePost, usePosts } from '@/entities/post';
import { useCounterStore } from '@/features/counter';

import './demo-widget.scss';

// ─── Схема валидации формы ────────────────────────────────────────────────────

const postSchema = z.object({
  title: z.string().min(5, 'Минимум 5 символов'),
  body: z.string().min(10, 'Минимум 10 символов'),
});

type PostFormValues = z.infer<typeof postSchema>;

/**
 * DemoWidget — демонстрационный компонент шаблона.
 *
 * Показывает совместную работу:
 * - Zustand: стор, immer-мутации, хуки-селекторы, useShallow
 * - TanStack Query: useQuery, зависимый запрос, useMutation с оптимистичным обновлением
 * - react-hook-form + zod: управляемая форма с валидацией схемы
 * - date-fns: форматирование даты и времени
 * - sonner: toast-уведомления
 * - clsx: условные CSS-классы
 */
export const DemoWidget = () => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [lastSubmitted, setLastSubmitted] = useState<Date | null>(null);

  // ─── Zustand (клиентское состояние) ──────────────────────────────────────
  // useShallow — предотвращает лишние ре-рендеры при выборке объекта из стора
  const { count, step, increment, decrement, reset, setStep } = useCounterStore(
    useShallow((s) => ({
      count: s.count,
      step: s.step,
      increment: s.increment,
      decrement: s.decrement,
      reset: s.reset,
      setStep: s.setStep,
    })),
  );

  // ─── TanStack Query (серверное состояние) ─────────────────────────────────
  // Запрос списка постов
  const { data: posts, isLoading, isError, error, refetch } = usePosts();

  // Зависимый запрос — выполняется только когда выбран пост (enabled: id !== null)
  const { data: selectedPost, isFetching: isDetailFetching } = usePost(selectedId);

  // ─── react-hook-form + zod ────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset: resetForm,
  } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
  });

  // Мутация с оптимистичным обновлением (используется в форме ниже)
  const { mutate: createPost, isPending: isPostPending } = useCreatePost();

  // ─── Обработчики ─────────────────────────────────────────────────────────

  const handleSelectPost = (id: number) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  const onFormSubmit = (data: PostFormValues) => {
    createPost(
      { userId: 1, title: data.title, body: data.body },
      {
        onSuccess: () => {
          // sonner: toast-уведомление об успехе
          toast.success('Пост создан!', { description: data.title });
          // date-fns: сохраняем время отправки для форматирования
          setLastSubmitted(new Date());
          resetForm();
        },
        onError: (err) => {
          toast.error('Ошибка при создании', { description: err.message });
        },
      },
    );
  };

  return (
    <div className="demo-widget">
      <h1 className="demo-widget__page-title">Template Demo</h1>
      <p className="demo-widget__subtitle">
        Демонстрация TanStack Query v5 + Zustand v5 + react-hook-form в архитектуре Feature Sliced
        Design.
      </p>

      <div className="demo-widget__grid">
        {/* ─── ZUSTAND ─────────────────────────────────────────────────── */}
        <section className="demo-widget__card">
          <h2 className="demo-widget__card-title">
            <span className="demo-widget__badge demo-widget__badge--zustand">Zustand</span>
            Клиентское состояние
          </h2>

          <div className="demo-widget__counter">
            <button
              className="demo-widget__btn demo-widget__btn--icon"
              onClick={decrement}
              aria-label="Уменьшить"
            >
              −
            </button>
            <span className="demo-widget__count" data-testid="counter-value">
              {count}
            </span>
            <button
              className="demo-widget__btn demo-widget__btn--icon"
              onClick={increment}
              aria-label="Увеличить"
            >
              +
            </button>
          </div>

          <div className="demo-widget__step-row">
            <label htmlFor="step-input" className="demo-widget__label">
              Шаг
            </label>
            <input
              id="step-input"
              className="demo-widget__input demo-widget__input--narrow"
              type="number"
              min={1}
              value={step}
              onChange={(e) => setStep(Number(e.target.value))}
            />
            <button className="demo-widget__btn demo-widget__btn--ghost" onClick={reset}>
              Сбросить
            </button>
          </div>

          <p className="demo-widget__hint">
            Откройте Redux DevTools → <em>Counter</em>, чтобы следить за состоянием стора.
          </p>
        </section>

        {/* ─── TANSTACK QUERY ───────────────────────────────────────────── */}
        <section className="demo-widget__card">
          <h2 className="demo-widget__card-title">
            <span className="demo-widget__badge demo-widget__badge--query">TanStack Query</span>
            Серверное состояние
          </h2>

          {/* Скелетон-загрузка */}
          {isLoading && (
            <ul
              className="demo-widget__skeleton-list"
              aria-busy="true"
              aria-label="Загрузка постов"
            >
              {[1, 2, 3].map((n) => (
                <li key={n} className="demo-widget__skeleton-item" />
              ))}
            </ul>
          )}

          {/* Состояние ошибки */}
          {isError && (
            <div className="demo-widget__error" role="alert">
              <span>⚠ {error.message}</span>
              <button
                className="demo-widget__btn demo-widget__btn--ghost"
                onClick={() => void refetch()}
              >
                Повторить
              </button>
            </div>
          )}

          {/* Список постов */}
          {posts && (
            <ul className="demo-widget__list" role="list">
              {posts.slice(0, 5).map((post) => (
                <li
                  key={post.id}
                  className={clsx('demo-widget__item', {
                    'demo-widget__item--active': selectedId === post.id,
                  })}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selectedId === post.id}
                  onClick={() => handleSelectPost(post.id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectPost(post.id)}
                >
                  <span className="demo-widget__item-id">#{post.id}</span>
                  <span className="demo-widget__item-title">{post.title}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Зависимый запрос — панель детали поста */}
          {selectedPost && (
            <div
              className={clsx('demo-widget__detail', {
                'demo-widget__detail--loading': isDetailFetching,
              })}
            >
              <h3 className="demo-widget__detail-title">{selectedPost.title}</h3>
              <p className="demo-widget__detail-body">{selectedPost.body}</p>
            </div>
          )}
        </section>

        {/* ─── ФОРМА: react-hook-form + zod + date-fns + sonner ────────── */}
        <section className="demo-widget__card">
          <h2 className="demo-widget__card-title">
            <span className="demo-widget__badge demo-widget__badge--form">Форма</span>
            react-hook-form + zod
          </h2>

          {/*
           * handleSubmit — оборачивает onFormSubmit, запускает валидацию zod перед вызовом.
           * noValidate — отключает нативную HTML-валидацию, управляем сами.
           */}
          <form className="demo-widget__fields" onSubmit={handleSubmit(onFormSubmit)} noValidate>
            <div className="demo-widget__field">
              <label htmlFor="rhf-title" className="demo-widget__label">
                Заголовок
              </label>
              {/* register — подключает поле к react-hook-form (ref + onChange + onBlur + name) */}
              <input
                id="rhf-title"
                className={clsx('demo-widget__input', {
                  'demo-widget__input--invalid': errors.title,
                })}
                placeholder="Минимум 5 символов…"
                {...register('title')}
              />
              {errors.title && (
                <span className="demo-widget__field-error" role="alert">
                  {errors.title.message}
                </span>
              )}
            </div>

            <div className="demo-widget__field">
              <label htmlFor="rhf-body" className="demo-widget__label">
                Текст поста
              </label>
              <textarea
                id="rhf-body"
                className={clsx('demo-widget__textarea', {
                  'demo-widget__textarea--invalid': errors.body,
                })}
                rows={3}
                placeholder="Минимум 10 символов…"
                {...register('body')}
              />
              {errors.body && (
                <span className="demo-widget__field-error" role="alert">
                  {errors.body.message}
                </span>
              )}
            </div>

            <button
              type="submit"
              className="demo-widget__btn demo-widget__btn--primary"
              disabled={isPostPending}
            >
              {isPostPending ? 'Отправка…' : 'Создать пост'}
            </button>
          </form>

          {/* date-fns: форматируем дату последней отправки с русской локалью */}
          {lastSubmitted && (
            <p className="demo-widget__hint">
              Последняя отправка:{' '}
              <strong>{format(lastSubmitted, 'd MMMM yyyy, HH:mm:ss', { locale: ru })}</strong>
            </p>
          )}
        </section>
      </div>
    </div>
  );
};
