export type DialogMode = 'describe' | 'ocr' | 'currency';

export type ChatMessage = {
  role: 'user' | 'assistant';
  text: string;
};
