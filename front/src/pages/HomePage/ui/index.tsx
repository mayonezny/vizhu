import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';

import { api } from '@/services/api';
import { VoiceRecordOverlay } from '@/widgets/VoiceRecordOverlay';

import { QuickActionButton } from './QuickActionButton';
import { QUICK_ACTIONS } from './quickActions';
import { VoiceButton } from './VoiceButton';

import './HomePage.scss';

export const HomePage = () => {
  const navigate = useNavigate();
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleSend = useCallback(
    async (blob: Blob, mimeType: string) => {
      setIsSending(true);
      try {
        const { text } = await api.stt(blob, mimeType);
        await api.questionMock(text);
        setOverlayOpen(false);
        void navigate('/dialog', { state: { transcript: text } });
      } finally {
        setIsSending(false);
      }
    },
    [navigate],
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
