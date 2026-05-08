const BASE = import.meta.env.VITE_API_URL as string;

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

async function postJson(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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
    const ext = (mimeType.split('/')[1] ?? 'webm').split(';')[0];
    fd.append('audio', audioBlob, `recording.${ext}`);
    fd.append('mime_type', mimeType);
    return post('/ai/stt', fd) as Promise<{ text: string }>;
  },

  classify(text: string): Promise<{ command: number; raw: string }> {
    return postJson('/ai/classify', { text }) as Promise<{ command: number; raw: string }>;
  },
};
