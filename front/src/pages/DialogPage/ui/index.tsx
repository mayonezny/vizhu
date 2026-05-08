import { MessageCircle, Mic, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { RoundButton } from '@/shared/ui/RoundButton';

import './DialogPage.scss';

type LocationState = { transcript?: string } | null;

export const DialogPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const transcript = (location.state as LocationState)?.transcript;

  useEffect(() => {
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleClose = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    void navigate('/', { replace: true });
  };

  return (
    <main id="main-content" className="dialog-page" tabIndex={-1} aria-label="Диалог с ИИ">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="dialog-page__camera"
        aria-hidden="true"
      />

      <div className="dialog-page__response" aria-live="polite" aria-label="Ответ ИИ">
        <p className="dialog-page__source">GigaChat</p>
        <p className="dialog-page__text">
          {transcript
            ? `Вы сказали: «${transcript}»`
            : 'Нажмите микрофон и скажите, что вы хотите сделать.'}
        </p>
      </div>

      <div className="dialog-page__controls" role="group" aria-label="Управление диалогом">
        <RoundButton
          className="dialog-page__btn-cancel"
          icon={<X size={20} aria-hidden="true" />}
          aria-label="Закрыть диалог и вернуться на главную"
          onClick={handleClose}
        />

        <RoundButton
          className="dialog-page__btn-mic"
          icon={<Mic size={28} aria-hidden="true" />}
          aria-label="Записать голосовое сообщение"
        />

        <RoundButton
          variant="filled"
          icon={<MessageCircle size={20} aria-hidden="true" />}
          aria-label="Отправить текстовое сообщение"
        />
      </div>
    </main>
  );
};
