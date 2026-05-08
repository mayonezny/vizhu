const BASE = '/api';

async function post(path: string, formData: FormData) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  describe(imageFile: File, mode: 'short' | 'detailed' = 'short') {
    const fd = new FormData();
    fd.append('image', imageFile);
    return post(`/ai/describe?mode=${mode}`, fd);
  },

  currency(imageFile: File) {
    const fd = new FormData();
    fd.append('image', imageFile);
    return post('/ai/currency', fd);
  },

  ocr(imageFile: File) {
    const fd = new FormData();
    fd.append('image', imageFile);
    return post('/ai/ocr', fd);
  },

  stt(audioBlob: Blob, mimeType: string): Promise<{ text: string }> {
    const fd = new FormData();
    fd.append('audio', audioBlob, `recording.${mimeType.split('/')[1] ?? 'webm'}`);
    fd.append('mime_type', mimeType);
    return post('/stt', fd) as Promise<{ text: string }>;
  },

  questionMock(_text: string): Promise<{ intent: string }> {
    return Promise.resolve({ intent: 'dialog' });
  },
};
