export type RequestType = 'describe' | 'currency' | 'ocr' | 'volunteer';

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  describe: 'Описание сцены',
  currency: 'Купюры',
  ocr: 'OCR',
  volunteer: 'Волонтёр',
};

export type HistoryMessage = {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string; // ISO 8601
};

export type HistoryEntry = {
  id: string;
  type: RequestType;
  title: string;
  messages: HistoryMessage[];
  createdAt: string; // ISO 8601
};
