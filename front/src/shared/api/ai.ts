import { api } from './axios';

export type DescribeResult = { text: string; model: string };
export type OcrResult = { text: string; model: string };
export type CurrencyResult = { amount: string; confidence: number };
export type ChatResult = { text: string; model: string };

export const aiApi = {
  describe: (imageFile: File, mode: 'short' | 'detailed' = 'detailed') => {
    const fd = new FormData();
    fd.append('image', imageFile);
    return api.post<DescribeResult>('/ai/describe', fd, { params: { mode } }).then((r) => r.data);
  },

  currency: (imageFile: File) => {
    const fd = new FormData();
    fd.append('image', imageFile);
    return api.post<CurrencyResult>('/ai/currency', fd).then((r) => r.data);
  },

  ocr: (imageFile: File) => {
    const fd = new FormData();
    fd.append('image', imageFile);
    return api.post<OcrResult>('/ai/ocr', fd).then((r) => r.data);
  },

  chat: (text: string) => api.post<ChatResult>('/ai/chat', { text }).then((r) => r.data),

  stt: (audioBlob: Blob, mimeType: string) => {
    const fd = new FormData();
    const ext = (mimeType.split('/')[1] ?? 'webm').split(';')[0];
    fd.append('audio', audioBlob, `recording.${ext}`);
    fd.append('mime_type', mimeType);
    return api.post<{ text: string }>('/ai/stt', fd).then((r) => r.data);
  },

  classify: (text: string) =>
    api.post<{ command: number; raw: string }>('/ai/classify', { text }).then((r) => r.data),
};
