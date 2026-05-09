import { api } from './axios';

export const aiApi = {
  describe: (imageFile: File, mode: 'short' | 'detailed' = 'short') => {
    const fd = new FormData();
    fd.append('image', imageFile);
    return api
      .post<{ description: string }>('/ai/describe', fd, { params: { mode } })
      .then((r) => r.data);
  },

  currency: (imageFile: File) => {
    const fd = new FormData();
    fd.append('image', imageFile);
    return api.post<{ denomination: string }>('/ai/currency', fd).then((r) => r.data);
  },

  ocr: (imageFile: File) => {
    const fd = new FormData();
    fd.append('image', imageFile);
    return api.post<{ text: string }>('/ai/ocr', fd).then((r) => r.data);
  },

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
