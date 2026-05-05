import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';

import { postApi } from './post.api';
import type { CreatePostDto, Post } from '../model/post.types';

// ─── Фабрика ключей запросов ──────────────────────────────────────────────────
//
// Централизует все ключи кэша для post-запросов.
// Преимущества:
//   - Инвалидировать всю группу:  queryClient.invalidateQueries({ queryKey: postKeys.all })
//   - Инвалидировать только списки: queryClient.invalidateQueries({ queryKey: postKeys.lists() })
//   - Инвалидировать один элемент: queryClient.invalidateQueries({ queryKey: postKeys.detail(id) })
//
export const postKeys = {
  all: ['posts'] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...postKeys.lists(), { filters }] as const,
  details: () => [...postKeys.all, 'detail'] as const,
  detail: (id: number) => [...postKeys.details(), id] as const,
} as const;

// ─── Хуки ─────────────────────────────────────────────────────────────────────

/** Получает полный список постов. */
export const usePosts = (options?: Partial<UseQueryOptions<Post[]>>) =>
  useQuery({
    queryKey: postKeys.lists(),
    queryFn: postApi.getList,
    ...options,
  });

/**
 * Получает один пост по ID.
 * Запрос **отключён** когда `id` равен null (паттерн зависимого/условного запроса).
 */
export const usePost = (id: number | null, options?: Partial<UseQueryOptions<Post>>) =>
  useQuery({
    queryKey: postKeys.detail(id!),
    queryFn: () => postApi.getById(id!),
    enabled: id !== null,
    ...options,
  });

/**
 * Создаёт новый пост с **оптимистичным обновлением**:
 * 1. Немедленно добавляет пост в кэш (ощущается мгновенно).
 * 2. При ошибке сервера откатывается к предыдущему снимку кэша.
 * 3. По завершении (успех или ошибка) инвалидирует список для синхронизации с сервером.
 */
export const useCreatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postApi.create,

    onMutate: async (newPost: CreatePostDto) => {
      // Отменяем текущие запросы списка, чтобы не перезаписать оптимистичное обновление
      await queryClient.cancelQueries({ queryKey: postKeys.lists() });

      // Сохраняем снимок для отката
      const previousPosts = queryClient.getQueryData<Post[]>(postKeys.lists());

      // Оптимистичное обновление — временный ID заменится после ответа сервера
      queryClient.setQueryData<Post[]>(postKeys.lists(), (old = []) => [
        ...old,
        { id: Date.now(), ...newPost },
      ]);

      return { previousPosts };
    },

    onError: (_err, _vars, context) => {
      // Откат при ошибке
      if (context?.previousPosts !== undefined) {
        queryClient.setQueryData(postKeys.lists(), context.previousPosts);
      }
    },

    onSettled: () => {
      // Всегда перезапрашиваем для синхронизации с сервером
      void queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
};

/** Удаляет пост и инвалидирует кэш списка. */
export const useDeletePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postApi.remove,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
};
