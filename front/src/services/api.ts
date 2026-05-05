// Все запросы к бэкенду через один объект
// BASE_URL = '' означает тот же домен (nginx проксирует /api/)

const BASE = '/api';

async function post(path: string, formData: FormData) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    body: formData,
    // Заголовок Content-Type НЕ ставим — браузер сам проставит boundary для multipart
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // ФТ-1: описание сцены
  describe(imageFile: File, mode: 'short' | 'detailed' = 'short') {
    const fd = new FormData();
    fd.append('image', imageFile);
    return post(`/ai/describe?mode=${mode}`, fd);
  },

  // ФТ-3: купюры
  currency(imageFile: File) {
    const fd = new FormData();
    fd.append('image', imageFile);
    return post('/ai/currency', fd);
  },

  // ФТ-2: OCR
  ocr(imageFile: File) {
    const fd = new FormData();
    fd.append('image', imageFile);
    return post('/ai/ocr', fd);
  },
};
