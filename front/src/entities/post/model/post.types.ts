export type Post = {
  id: number;
  userId: number;
  title: string;
  body: string;
};

export type CreatePostDto = Omit<Post, 'id'>;
export type UpdatePostDto = Partial<CreatePostDto>;
