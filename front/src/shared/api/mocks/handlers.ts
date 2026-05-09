import { http, HttpResponse } from 'msw';

import type { Post } from '@/entities/post';

const MOCK_POSTS: Post[] = [
  { id: 1, userId: 1, title: 'Mock Post One', body: 'Body of mock post one.' },
  { id: 2, userId: 1, title: 'Mock Post Two', body: 'Body of mock post two.' },
  { id: 3, userId: 2, title: 'Mock Post Three', body: 'Body of mock post three.' },
];

export const handlers = [
  http.post('*/ai/stt', async () => {
    await new Promise((r) => setTimeout(r, 800));
    return HttpResponse.json({ text: 'тестовый распознанный текст' });
  }),

  http.post('*/ai/classify', async () => {
    await new Promise((r) => setTimeout(r, 300));
    return HttpResponse.json({ command: 1, raw: 'тестовый распознанный текст' });
  }),

  http.get('*/posts', () => HttpResponse.json(MOCK_POSTS)),

  http.get('*/posts/:id', ({ params }) => {
    const post = MOCK_POSTS.find((p) => p.id === Number(params.id));
    if (!post) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json(post);
  }),

  http.post('*/posts', async ({ request }) => {
    const body = (await request.json()) as Omit<Post, 'id'>;
    const newPost: Post = { id: Date.now(), ...body };
    return HttpResponse.json(newPost, { status: 201 });
  }),

  http.delete('*/posts/:id', () => new HttpResponse(null, { status: 204 })),
];
