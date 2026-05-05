import { api } from '@/shared/api';

import type { Post, CreatePostDto, UpdatePostDto } from '../model/post.types';

export const postApi = {
  getList: (): Promise<Post[]> => api.get<Post[]>('/posts').then((r) => r.data),

  getById: (id: number): Promise<Post> => api.get<Post>(`/posts/${id}`).then((r) => r.data),

  create: (dto: CreatePostDto): Promise<Post> => api.post<Post>('/posts', dto).then((r) => r.data),

  update: (id: number, dto: UpdatePostDto): Promise<Post> =>
    api.patch<Post>(`/posts/${id}`, dto).then((r) => r.data),

  remove: (id: number): Promise<void> => api.delete(`/posts/${id}`).then(() => undefined),
};
