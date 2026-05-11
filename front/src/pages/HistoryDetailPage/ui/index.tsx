import { ArrowBigLeft, Copy, Share2, Sun, Volume2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { useHistoryEntry } from '@/entities/history';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';
import { estimateDialogDuration } from '@/shared/lib/estimate-duration';
import { useTheme } from '@/shared/lib/theme';
import { Button } from '@/shared/ui/Button';
import { DialogBubble } from '@/shared/ui/DialogBubble';
import { RoundButton } from '@/shared/ui/RoundButton';

import './HistoryDetailPage.scss';

const buildExportText = (
  title: string,
  messages: { role: 'user' | 'assistant'; text: string; timestamp: string }[],
): string => {
  const header = `${title}\n${'─'.repeat(40)}\n\n`;
  const body = messages
    .map((m) => {
      const who = m.role === 'user' ? 'Вы' : 'Нейропомощник';
      const time = new Date(m.timestamp).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `[${time}] ${who}: ${m.text}`;
    })
    .join('\n\n');
  return header + body;
};

export const HistoryDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toggle } = useTheme();
  const dialogRef = useRef<HTMLElement>(null);
  const [dialogVisible, setDialogVisible] = useState(false);

  const { data: entry, isLoading } = useHistoryEntry(id);

  const duration = entry ? estimateDialogDuration(entry.messages) : '';

  // Снимает aria-hidden с диалога и передаёт фокус — TalkBack начнёт читать отсюда
  const handlePlayAll = () => {
    setDialogVisible(true);
    requestAnimationFrame(() => dialogRef.current?.focus());
  };

  const handleCopy = async () => {
    if (!entry) {
      return;
    }
    try {
      await navigator.clipboard.writeText(buildExportText(entry.title, entry.messages));
      announceRouteChange('Диалог скопирован в буфер обмена');
    } catch {
      announceRouteChange('Не удалось скопировать. Попробуйте ещё раз.');
    }
  };

  const handleShare = async () => {
    if (!entry) {
      return;
    }
    const text = buildExportText(entry.title, entry.messages);

    // Web Share API — нативный шарит на мобиле
    if (navigator.share) {
      try {
        await navigator.share({ title: entry.title, text });
        return;
      } catch {
        // пользователь отменил или API недоступен — fallback ниже
      }
    }

    // Fallback: скачать txt-файл
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date(entry.createdAt).toLocaleDateString('ru-RU').replace(/\./g, '-');
    a.href = url;
    a.download = `vizhu-${entry.title}-${date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const header = (title: string) => (
    <header className="history-detail__header" role="banner">
      <RoundButton
        icon={<ArrowBigLeft size={24} />}
        aria-label="Назад, вернуться к истории"
        onClick={() => navigate(-1)}
      />
      <h1 className="history-detail__title">{title}</h1>
      <RoundButton icon={<Sun size={24} />} aria-label="Переключить тему" onClick={toggle} />
    </header>
  );

  if (isLoading) {
    return (
      <div className="history-detail" aria-busy="true">
        {header('История')}
        <p className="history-detail__loading" role="status">
          Загрузка…
        </p>
      </div>
    );
  }

  if (!entry) {
    return <div className="history-detail">{header('Запись не найдена')}</div>;
  }

  return (
    <div className="history-detail">
      {header(entry.title)}

      {/* Не скроллится — фиксированный блок под хедером */}
      <button
        className="history-detail__play-card"
        aria-label={`Озвучить весь диалог. ${duration}`}
        onClick={handlePlayAll}
      >
        <span className="history-detail__play-icon" aria-hidden="true">
          <Volume2 size={32} />
        </span>
        <span className="history-detail__play-text">
          <span className="history-detail__play-title">Озвучить весь диалог</span>
          <span className="history-detail__play-duration">{duration}</span>
          <span className="history-detail__play-subtitle" aria-hidden="true">
            (Доступно только с включенным экранным диктором)
          </span>
        </span>
      </button>

      {/* Скроллируемая область — скрыта от TalkBack до нажатия кнопки выше */}
      <main id="main-content" className="history-detail__main" tabIndex={-1}>
        <section
          ref={dialogRef}
          className="history-detail__dialog"
          aria-label={`Диалог: ${entry.title}`}
          aria-hidden={!dialogVisible}
          tabIndex={-1}
        >
          {entry.messages.map((msg, i) => (
            <DialogBubble key={i} role={msg.role} text={msg.text} timestamp={msg.timestamp} />
          ))}
        </section>
      </main>

      <div className="history-detail__actions" role="group" aria-label="Действия с записью">
        <Button
          icon={<Copy size={20} aria-hidden="true" />}
          iconPosition="left"
          aria-label="Скопировать диалог в буфер обмена"
          onClick={() => void handleCopy()}
        >
          Скопировать
        </Button>
        <Button
          icon={<Share2 size={20} aria-hidden="true" />}
          iconPosition="left"
          aria-label="Поделиться диалогом"
          onClick={() => void handleShare()}
        >
          Поделиться
        </Button>
      </div>
    </div>
  );
};
