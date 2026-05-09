import { useCallback, useState } from 'react';
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

const getRouteForCommand = (command: number): string | null => COMMAND_ROUTES[command] ?? null;

export const HomePage = () => {
  const navigate = useNavigate();
  const [overlayOpen, setOverlayOpen] = useState(false);
  const { processAudio, isSending } = useVoiceCommand();

  const handleSend = useCallback(
    async (blob: Blob, mimeType: string) => {
      try {
        const { text, command } = await processAudio(blob, mimeType);
        setOverlayOpen(false);
        const route = getRouteForCommand(command);
        if (!route) {
          announceRouteChange('Мы не поняли, что вы хотите сделать. Повторите команду ещё раз.');
          return;
        }
        void navigate(route, { state: { transcript: text, command } });
      } catch {
        announceRouteChange('Ошибка обработки запроса. Попробуйте ещё раз.');
      }
    },
    [navigate, processAudio],
  );

  return (
    <div className="home-page">
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
