import { useMutation, useQueryClient } from '@tanstack/react-query';

import { historyKeys } from '@/entities/history';
import { aiApi } from '@/shared/api';

const useInvalidateHistory = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: historyKeys.list() });
};

export const useDescribeMutation = () => {
  const invalidate = useInvalidateHistory();
  return useMutation({
    mutationFn: (imageFile: File) => aiApi.describe(imageFile, 'detailed'),
    onSuccess: invalidate,
  });
};

export const useOcrMutation = () => {
  const invalidate = useInvalidateHistory();
  return useMutation({
    mutationFn: (imageFile: File) => aiApi.ocr(imageFile),
    onSuccess: invalidate,
  });
};

export const useCurrencyMutation = () => {
  const invalidate = useInvalidateHistory();
  return useMutation({
    mutationFn: (imageFile: File) => aiApi.currency(imageFile),
    onSuccess: invalidate,
  });
};

export const useChatMutation = () => {
  const invalidate = useInvalidateHistory();
  return useMutation({
    mutationFn: ({ text, context }: { text: string; context?: string }) =>
      aiApi.chat(text, context),
    onSuccess: invalidate,
  });
};

export const useSttMutation = () =>
  useMutation({
    mutationFn: ({ blob, mimeType }: { blob: Blob; mimeType: string }) => aiApi.stt(blob, mimeType),
  });
