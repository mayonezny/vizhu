import { useMutation } from '@tanstack/react-query';

import { aiApi } from '@/shared/api';

export const useDescribeMutation = () =>
  useMutation({ mutationFn: (imageFile: File) => aiApi.describe(imageFile, 'detailed') });

export const useOcrMutation = () =>
  useMutation({ mutationFn: (imageFile: File) => aiApi.ocr(imageFile) });

export const useCurrencyMutation = () =>
  useMutation({ mutationFn: (imageFile: File) => aiApi.currency(imageFile) });

export const useChatMutation = () =>
  useMutation({ mutationFn: (text: string) => aiApi.chat(text) });

export const useSttMutation = () =>
  useMutation({
    mutationFn: ({ blob, mimeType }: { blob: Blob; mimeType: string }) => aiApi.stt(blob, mimeType),
  });
