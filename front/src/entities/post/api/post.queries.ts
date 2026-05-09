import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { postApi } from './post.api';
import type { CreatePostDto } from '../model/post.types';

export const postKeys = {
  all: ['posts'] as const,
  list: () => [...postKeys.all, 'list'] as const,
  detail: (id: number) => [...postKeys.all, 'detail', id] as const,
};

export const usePosts = () =>
  useQuery({
    queryKey: postKeys.list(),
    queryFn: postApi.getList,
    staleTime: 1000 * 60 * 5,
  });

export const usePost = (id: number | null) =>
  useQuery({
    queryKey: postKeys.detail(id!),
    queryFn: () => postApi.getById(id!),
    enabled: id !== null,
  });

export const useCreatePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatePostDto) => postApi.create(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: postKeys.list() }),
  });
};

export const useDeletePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => postApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: postKeys.list() }),
  });
};
