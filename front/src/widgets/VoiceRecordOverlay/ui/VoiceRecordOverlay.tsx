import { Loader2, Mic, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { announceRouteChange } from '@/shared/lib/a11y/announcer';
import { useVoiceRecord } from '@/shared/lib/use-voice-record';
import { RoundButton } from '@/shared/ui/RoundButton';

import { Waveform } from './Waveform';

import './VoiceRecordOverlay.scss';

type Props = {
  onClose: () => void;
  onSend: (blob: Blob, mimeType: string) => Promise<void>;
  isSending: boolean;
};

const ERROR_MESSAGES = {
  permission_denied: 'Нет доступа к микрофону — разрешите в настройках браузера',
  not_found: 'Микрофон не найден',
  unknown: 'Ошибка записи. Попробуйте ещё раз.',
} as const;

export const VoiceRecordOverlay = ({ onClose, onSend, isSending }: Props) => {
  const { status, audioBlob, analyserNode, error, start, stop, cancel } = useVoiceRecord();
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const shouldAutoSendRef = useRef(false);
  const onSendRef = useRef(onSend);
  onSendRef.current = onSend;

  const [isAutoSending, setIsAutoSending] = useState(false);

  useEffect(() => {
    prevFocusRef.current = document.activeElement as HTMLElement;
    requestAnimationFrame(() => {
      panelRef.current?.querySelector('button')?.focus();
    });
    void start();
    announceRouteChange('Говорите. Нажмите кнопку когда закончите.');
    return () => {
      prevFocusRef.current?.focus();
    };
  }, [start]);

  useEffect(() => {
    if (error) {
      announceRouteChange(ERROR_MESSAGES[error]);
    }
  }, [error]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSending && !isAutoSending) {
        cancel();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [cancel, isAutoSending, isSending, onClose]);

  // Auto-send as soon as the blob is ready after manual stop
  useEffect(() => {
    if (status !== 'stopped' || !audioBlob || !shouldAutoSendRef.current) {
      return;
    }
    shouldAutoSendRef.current = false;
    announceRouteChange('Отправка...');
    setIsAutoSending(true);
    void onSendRef.current(audioBlob, audioBlob.type || 'audio/webm').finally(() => {
      setIsAutoSending(false);
    });
  }, [status, audioBlob]);

  const handleStop = () => {
    shouldAutoSendRef.current = true;
    stop();
  };

  const handleCancel = () => {
    cancel();
    onClose();
  };

  const isActive = status === 'requesting' || status === 'recording';
  const isBusy = isSending || isAutoSending;

  const statusText = error ? ERROR_MESSAGES[error] : isBusy ? 'Отправка...' : 'Говорите...';

  return createPortal(
    <div className="voice-overlay" role="dialog" aria-modal="true" aria-label="Запись голоса">
      <div className="voice-overlay__backdrop" onClick={handleCancel} aria-hidden="true" />

      <div className="voice-overlay__panel" ref={panelRef}>
        <p className="voice-overlay__status" aria-live="polite" aria-atomic="true">
          {statusText}
        </p>

        <Waveform analyserNode={analyserNode} />

        <div className="voice-overlay__controls" role="group" aria-label="Управление записью">
          {isActive && (
            <RoundButton
              className="voice-overlay__btn-mic"
              icon={<Mic size={28} aria-hidden="true" />}
              aria-label="Остановить запись и отправить"
              onClick={handleStop}
            />
          )}

          {isBusy && (
            <RoundButton
              className="voice-overlay__btn-sending"
              icon={<Loader2 size={28} className="voice-overlay__spinner" aria-hidden="true" />}
              aria-label="Отправка..."
              disabled
            />
          )}

          <RoundButton
            className="voice-overlay__btn-cancel"
            icon={<X size={20} aria-hidden="true" />}
            aria-label="Отменить запись"
            disabled={isBusy}
            onClick={handleCancel}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
};
