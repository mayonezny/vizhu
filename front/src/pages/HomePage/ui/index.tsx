import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { useVoiceCommand } from '@/features/voice-command';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';
import { VoiceRecordOverlay } from '@/widgets/VoiceRecordOverlay';

import { QuickActionButton } from './QuickActionButton';
import { VoiceButton } from './VoiceButton';
import { QUICK_ACTIONS } from '../model/quick-actions';

import './HomePage.scss';

const COMMAND_ROUTES: Record<number, string> = {
  1: '/dialog?mode=describe',
  2: '/dialog?mode=ocr',
  3: '/dialog?mode=currency',
};

const COMMAND_ACTION_LABELS: Record<number, string> = {
  1: 'Открываю камеру для описания фотографии',
  2: 'Открываю камеру для распознавания текста',
  3: 'Открываю камеру для распознавания купюры',
  4: 'Открываю меню вызова волонтёра',
};

const REDIRECT_DELAY_MS = 5000;

type Notification = { text: string; isError: boolean };

export const HomePage = () => {
  const navigate = useNavigate();
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const { processAudio, isSending } = useVoiceCommand();
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (notifTimerRef.current) {
        clearTimeout(notifTimerRef.current);
      }
    },
    [],
  );

  const handleSend = useCallback(
    async (blob: Blob, mimeType: string) => {
      try {
        const { text, command } = await processAudio(blob, mimeType);
        setOverlayOpen(false);

        if (notifTimerRef.current) {
          clearTimeout(notifTimerRef.current);
        }

        const route = COMMAND_ROUTES[command] ?? null;
        if (!route) {
          const msg = 'Голосовой ассистент не смог распознать вашу команду. Попробуйте ещё раз.';
          setNotification({ text: msg, isError: true });
          announceRouteChange(msg);
          notifTimerRef.current = setTimeout(() => setNotification(null), 4000);
          return;
        }

        const actionLabel = COMMAND_ACTION_LABELS[command] ?? 'Открываю камеру';
        const previewMsg = `Вы сказали: «${text}». ${actionLabel}.`;
        setNotification({ text: previewMsg, isError: false });
        announceRouteChange(previewMsg);

        notifTimerRef.current = setTimeout(() => {
          setNotification(null);
          void navigate(route, { state: { transcript: text, command } });
        }, REDIRECT_DELAY_MS);
      } catch {
        announceRouteChange('Ошибка обработки запроса. Попробуйте ещё раз.');
      }
    },
    [navigate, processAudio],
  );

  return (
    <div
      className="home-page"
      aria-label="Панель действий. Смахните вправо чтобы перейти к голосовому ассистенту"
    >
      <VoiceButton onClick={() => setOverlayOpen(true)} />

      <section aria-labelledby="quick-actions-heading" className="home-page__quick-actions">
        <h2 id="quick-actions-heading" className="home-page__section-title">
          Быстрые действия
        </h2>
        <ul className="home-page__grid" role="list">
          {QUICK_ACTIONS.map(({ id, label, to, prompt, Icon, ariaLabel }) => (
            <li key={id}>
              <QuickActionButton
                label={label}
                to={to}
                prompt={prompt}
                Icon={Icon}
                ariaLabel={ariaLabel}
              />
            </li>
          ))}
        </ul>
      </section>

      {notification && (
        <div
          className={`home-page__notification${notification.isError ? ' home-page__notification--error' : ''}`}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <p className="home-page__notification-text">{notification.text}</p>
        </div>
      )}

      {overlayOpen && (
        <VoiceRecordOverlay
          onClose={() => setOverlayOpen(false)}
          onSend={handleSend}
          isSending={isSending}
        />
      )}
    </div>
  );
};
