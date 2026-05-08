import { Loader2, Mic, Send, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
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

export const VoiceRecordOverlay = ({ onClose, onSend, isSending }: Props) => {
  const { status, audioBlob, analyserNode, start, stop, cancel } = useVoiceRecord();
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSending) {
        cancel();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [cancel, isSending, onClose]);

  const handleStop = () => {
    stop();
    announceRouteChange('Запись остановлена. Нажмите Отправить.');
  };

  const handleSend = async () => {
    if (!audioBlob) {
      return;
    }
    announceRouteChange('Отправка...');
    await onSend(audioBlob, audioBlob.type || 'audio/webm');
  };

  const handleCancel = () => {
    cancel();
    onClose();
  };

  const isActive = status === 'requesting' || status === 'recording';
  const isStopped = status === 'stopped';

  return createPortal(
    <div className="voice-overlay" role="dialog" aria-modal="true" aria-label="Запись голоса">
      <div className="voice-overlay__backdrop" onClick={handleCancel} aria-hidden="true" />

      <div className="voice-overlay__panel" ref={panelRef}>
        <p className="voice-overlay__status" aria-live="polite" aria-atomic="true">
          {isSending ? 'Отправка...' : isStopped ? 'Готово — нажмите Отправить' : 'Говорите...'}
        </p>

        <Waveform analyserNode={analyserNode} />

        <div className="voice-overlay__controls" role="group" aria-label="Управление записью">
          <RoundButton
            className="voice-overlay__btn-cancel"
            icon={<X size={20} aria-hidden="true" />}
            aria-label="Отменить запись"
            disabled={isSending}
            onClick={handleCancel}
          />

          {isActive && (
            <RoundButton
              className="voice-overlay__btn-mic"
              icon={<Mic size={28} aria-hidden="true" />}
              aria-label="Остановить запись"
              onClick={handleStop}
            />
          )}

          {isStopped && (
            <RoundButton
              className="voice-overlay__btn-send"
              icon={
                isSending ? (
                  <Loader2 size={20} className="voice-overlay__spinner" aria-hidden="true" />
                ) : (
                  <Send size={20} aria-hidden="true" />
                )
              }
              aria-label="Отправить запись"
              disabled={isSending || !audioBlob}
              onClick={() => void handleSend()}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
