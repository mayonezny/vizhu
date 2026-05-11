import { formatTime } from '@/shared/lib/date';

import './DialogBubble.scss';

type DialogBubbleProps = {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string; // ISO 8601
};

export const DialogBubble = ({ role, text, timestamp }: DialogBubbleProps) => (
  <div
    className={`dialog-bubble dialog-bubble--${role}`}
    role="article"
    aria-label={`${role === 'user' ? 'Вы' : 'Нейропомощник'}: ${text}`}
  >
    <p className="dialog-bubble__text">{text}</p>
    <time className="dialog-bubble__time" dateTime={timestamp} aria-hidden="true">
      {formatTime(timestamp)}
    </time>
  </div>
);
