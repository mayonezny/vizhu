export interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}

export interface CreatePostDto {
  userId: number;
  title: string;
  body: string;
}

export interface UpdatePostDto {
  title?: string;
  body?: string;
}
