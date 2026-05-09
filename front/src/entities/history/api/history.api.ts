import { api } from '@/shared/api';

import type { HistoryEntry } from '../model/history.types';

export const historyApi = {
  // GET /api/history
  getAll: (): Promise<HistoryEntry[]> => api.get<HistoryEntry[]>('/history').then((r) => r.data),

  // GET /api/history/:id
  getById: (id: string): Promise<HistoryEntry> =>
    api.get<HistoryEntry>(`/history/${id}`).then((r) => r.data),

  // DELETE /api/history/:id
  deleteById: (id: string): Promise<void> => api.delete(`/history/${id}`).then(() => undefined),
};
