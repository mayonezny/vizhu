import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { historyApi } from './history.api';

export const historyKeys = {
  all: ['history'] as const,
  list: () => [...historyKeys.all, 'list'] as const,
  detail: (id: string) => [...historyKeys.all, 'detail', id] as const,
};

export const useHistory = () =>
  useQuery({
    queryKey: historyKeys.list(),
    queryFn: historyApi.getAll,
    staleTime: 1000 * 60 * 5,
  });

export const useHistoryEntry = (id: string | undefined) =>
  useQuery({
    queryKey: historyKeys.detail(id!),
    queryFn: () => historyApi.getById(id!),
    enabled: Boolean(id),
  });

export const useDeleteHistoryEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: historyApi.deleteById,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: historyKeys.list() }),
  });
};
