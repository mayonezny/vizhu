// ─── Общие утилитарные типы ────────────────────────────────────────────────────

/** Делает указанные ключи обязательными (дополнение к Partial) */
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/** Делает указанные ключи опциональными */
export type PartialKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Типовой ответ API со страницами */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Типовая форма ошибки API */
export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}

/** Тип, допускающий null */
export type Nullable<T> = T | null;

/** Тип асинхронной функции */
export type AsyncFn<TArgs extends unknown[] = [], TReturn = void> = (
  ...args: TArgs
) => Promise<TReturn>;
