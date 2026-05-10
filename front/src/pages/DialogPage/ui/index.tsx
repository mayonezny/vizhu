import {
  Camera,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Mic,
  RotateCcw,
  Send,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import {
  type ChatMessage,
  type DialogMode,
  useChatMutation,
  useCurrencyMutation,
  useDescribeMutation,
  useOcrMutation,
  useSttMutation,
} from '@/features/ai-dialog';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';
import { RoundButton } from '@/shared/ui/RoundButton';
import { VoiceRecordOverlay } from '@/widgets/VoiceRecordOverlay';

import './DialogPage.scss';

type Phase = 'camera' | 'processing' | 'result' | 'chat';

const MODE_LABELS: Record<DialogMode, string> = {
  describe: 'Описание сцены',
  ocr: 'Распознавание текста',
  currency: 'Определение купюры',
};

export const DialogPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = (searchParams.get('mode') ?? 'describe') as DialogMode;

  const [phase, setPhase] = useState<Phase>('camera');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [resultIsError, setResultIsError] = useState(false);
  const [cameraErr, setCameraErr] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [isBubbleHeld, setIsBubbleHeld] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const describeMutation = useDescribeMutation();
  const ocrMutation = useOcrMutation();
  const currencyMutation = useCurrencyMutation();
  const chatMutation = useChatMutation();
  const sttMutation = useSttMutation();

  // Revoke object URL on cleanup
  useEffect(
    () => () => {
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }
    },
    [photoUrl],
  );

  // Start camera when in camera phase
  useEffect(() => {
    if (phase !== 'camera') {
      return;
    }
    let cancelled = false;
    setCameraErr(null);

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      .then(async (stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Автофокус, баланс белого, экспозиция + компенсация зума ультраширокого объектива
        const track = stream.getVideoTracks()[0];
        if (track) {
          type ExtConstraints = MediaTrackConstraintSet & {
            focusMode?: string;
            whiteBalanceMode?: string;
            exposureMode?: string;
            zoom?: number;
          };
          type ExtCapabilities = MediaTrackCapabilities & {
            focusMode?: string[];
            whiteBalanceMode?: string[];
            exposureMode?: string[];
            zoom?: { min: number; max: number; step: number };
          };
          const caps = track.getCapabilities() as ExtCapabilities;
          const advanced: ExtConstraints[] = [];

          if (caps.focusMode?.includes('continuous')) {
            advanced.push({ focusMode: 'continuous' });
          }
          if (caps.whiteBalanceMode?.includes('continuous')) {
            advanced.push({ whiteBalanceMode: 'continuous' });
          }
          if (caps.exposureMode?.includes('continuous')) {
            advanced.push({ exposureMode: 'continuous' });
          }
          // getUserMedia на Android часто выбирает ультраширокий объектив (0.6x).
          // Зум ~1.3x приближает картинку к основному объективу (1x в нативной камере).
          if (caps.zoom) {
            const targetZoom = Math.min(1.3, caps.zoom.max);
            advanced.push({ zoom: targetZoom });
          }

          if (advanced.length > 0) {
            await track
              .applyConstraints({ advanced: advanced as MediaTrackConstraintSet[] })
              .catch(() => {});
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCameraErr('Нет доступа к камере. Проверьте настройки браузера.');
          announceRouteChange('Нет доступа к камере.');
        }
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
      }
    };
  }, [phase]);

  // Wait for video to be ready, then start 3s countdown
  useEffect(() => {
    if (phase !== 'camera' || cameraErr) {
      return;
    }
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const scheduleCountdown = () => {
      if ((video.readyState ?? 0) >= 2) {
        announceRouteChange(`${MODE_LABELS[mode]}. Камера готова. Нажмите кнопку для снимка.`);
        // auto-capture disabled — пользователь снимает вручную
        // setCountdown(3);
      } else {
        countdownTimerRef.current = setTimeout(scheduleCountdown, 200);
      }
    };
    countdownTimerRef.current = setTimeout(scheduleCountdown, 600);

    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
      }
    };
  }, [phase, cameraErr, mode]);

  // Countdown tick
  useEffect(() => {
    if (countdown === null || countdown <= 0) {
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((c) => {
        if (c === null || c <= 1) {
          void doCapture();
          return null;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const runAnalysis = useCallback(
    async (file: File) => {
      setPhase('processing');
      setResultIsError(false);
      announceRouteChange('Анализирую фото...');
      try {
        let text: string;
        if (mode === 'ocr') {
          const raw = (await ocrMutation.mutateAsync(file)).text.trim();
          text =
            raw || 'Нейропомощнику не удалось распознать текст на фотографии, попробуйте ещё раз';
        } else if (mode === 'currency') {
          const r = await currencyMutation.mutateAsync(file);
          if (!r.amount.trim()) {
            text = 'Нейропомощнику не удалось распознать номинал купюры, попробуйте ещё раз';
          } else {
            const pct = Math.round(r.confidence * 100);
            text = `${r.amount}. Уверенность: ${pct}%.`;
          }
        } else {
          text = (await describeMutation.mutateAsync(file)).text;
        }
        setResultText(text);
        setPhase('result');
        announceRouteChange(`Ответ от нейропомощника: ${text}`);
      } catch {
        setResultText('Произошла непредвиденная ошибка. Попробуйте ещё раз.');
        setResultIsError(true);
        setPhase('result');
        announceRouteChange('Произошла непредвиденная ошибка. Попробуйте ещё раз.');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode],
  );

  const doCapture = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    const video = videoRef.current;
    if (!track || !video || video.videoWidth === 0) {
      return;
    }

    // Попытка залочить фокус перед снимком
    type ExtConstraints = MediaTrackConstraintSet & { focusMode?: string };
    type ExtCapabilities = MediaTrackCapabilities & { focusMode?: string[] };
    const caps = track.getCapabilities() as ExtCapabilities;
    if (caps.focusMode?.includes('single-shot')) {
      await track
        .applyConstraints({ advanced: [{ focusMode: 'single-shot' } as ExtConstraints] })
        .catch(() => {});
      // Samsung Browser / Chrome на Android — фокус-лок занимает до 600–800ms
      await new Promise<void>((r) => setTimeout(r, 700));
    }

    let blob: Blob | null = null;

    // ImageCapture — аппаратный затвор, нативное разрешение (Chrome / Android)
    if ('ImageCapture' in window) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ic = new (window as any).ImageCapture(track);
        blob = (await ic.takePhoto()) as Blob;
        console.log(
          '[capture] ImageCapture.takePhoto()',
          `${(blob.size / 1024).toFixed(0)} KB`,
          blob.type,
        );
      } catch (e) {
        console.warn('[capture] ImageCapture failed, fallback to canvas', e);
      }
    }

    // Fallback: читаем текущий кадр через canvas
    if (!blob) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }
      ctx.drawImage(video, 0, 0);
      blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.92));
      if (blob) {
        console.log('[capture] canvas fallback', `${(blob.size / 1024).toFixed(0)} KB`, blob.type);
      }
    }

    track.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());

    if (!blob) {
      return;
    }
    const file = new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' });
    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
    void runAnalysis(file);
  }, [runAnalysis]);

  const handleGalleryPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        return;
      }
      const url = URL.createObjectURL(file);
      setPhotoUrl(url);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      void runAnalysis(file);
      e.target.value = '';
    },
    [runAnalysis],
  );

  const handleBubblePointerDown = useCallback(() => {
    const release = () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      setIsBubbleHeld(false);
      document.removeEventListener('pointerup', release);
      document.removeEventListener('pointercancel', release);
    };
    document.addEventListener('pointerup', release);
    document.addEventListener('pointercancel', release);

    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      setIsBubbleHeld(true);
    }, 600);
  }, []);

  const handleRetake = () => {
    setIsBubbleHeld(false);
    setResultText(null);
    setPhase('camera');
  };

  const handleGoHome = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    void navigate('/', { replace: true });
  };

  const handleOpenChat = () => {
    setMessages(resultText ? [{ role: 'assistant', text: resultText }] : []);
    setPhase('chat');
    announceRouteChange('Диалог о фото. Задайте вопрос.');
  };

  const sendChatText = async (text: string) => {
    if (!text.trim() || isChatSending) {
      return;
    }
    const trimmed = text.trim();
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setChatInput('');
    setIsChatSending(true);
    try {
      const result = await chatMutation.mutateAsync({
        text: trimmed,
        context: resultText ?? undefined,
      });
      setMessages((prev) => [...prev, { role: 'assistant', text: result.text }]);
      announceRouteChange(`Ответ: ${result.text}`);
    } catch {
      announceRouteChange('Ошибка отправки. Попробуйте ещё раз.');
    } finally {
      setIsChatSending(false);
    }
  };

  const handleVoiceSend = async (blob: Blob, mimeType: string) => {
    setVoiceOpen(false);
    try {
      const { text } = await sttMutation.mutateAsync({ blob, mimeType });
      await sendChatText(text);
    } catch {
      announceRouteChange('Ошибка распознавания речи. Попробуйте ещё раз.');
    }
  };

  // ── Camera phase ──────────────────────────────────────────────────────────
  if (phase === 'camera') {
    return (
      <main id="main-content" className="dialog-page" tabIndex={-1} aria-label={MODE_LABELS[mode]}>
        {!cameraErr && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="dialog-page__camera"
            aria-hidden="true"
          />
        )}

        {countdown !== null && (
          <div
            className="dialog-page__countdown"
            aria-live="assertive"
            aria-atomic="true"
            aria-label={`Снимок через ${countdown}`}
          >
            {countdown}
          </div>
        )}

        {cameraErr && (
          <div className="dialog-page__cam-error" role="alert">
            <p>{cameraErr}</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="dialog-page__file-input"
          onChange={handleGalleryPick}
          aria-hidden="true"
          tabIndex={-1}
        />

        <div className="dialog-page__controls" role="group" aria-label="Управление камерой">
          <RoundButton
            className="dialog-page__btn-capture"
            icon={<Camera size={28} aria-hidden="true" />}
            aria-label="Сделать снимок"
            onClick={() => void doCapture()}
            disabled={Boolean(cameraErr)}
          />
          <RoundButton
            className="dialog-page__btn-cancel"
            icon={<X size={20} aria-hidden="true" />}
            aria-label="Закрыть и вернуться на главную"
            onClick={handleGoHome}
          />
          <RoundButton
            className="dialog-page__btn-gallery"
            icon={<ImageIcon size={20} aria-hidden="true" />}
            aria-label="Выбрать фото из галереи"
            onClick={() => fileInputRef.current?.click()}
          />
        </div>
      </main>
    );
  }

  // ── Processing phase ──────────────────────────────────────────────────────
  if (phase === 'processing') {
    return (
      <main
        id="main-content"
        className="dialog-page dialog-page--processing"
        tabIndex={-1}
        aria-label="Анализ фото"
      >
        {photoUrl && (
          <img src={photoUrl} alt="" aria-hidden="true" className="dialog-page__photo" />
        )}
        <div className="dialog-page__processing-overlay" role="status">
          <Loader2 size={52} className="dialog-page__spinner" aria-hidden="true" />
          <p className="dialog-page__processing-text">Анализирую...</p>
        </div>
      </main>
    );
  }

  // ── Result phase ──────────────────────────────────────────────────────────
  if (phase === 'result') {
    return (
      <main id="main-content" className="dialog-page" tabIndex={-1} aria-label="Результат анализа">
        {photoUrl && (
          <img src={photoUrl} alt="" aria-hidden="true" className="dialog-page__photo" />
        )}

        <div
          className={`dialog-page__result${isBubbleHeld ? ' dialog-page__result--held' : ''}`}
          role="article"
          aria-label="Ответ от нейропомощника. Удерживайте, чтобы временно скрыть."
          onPointerDown={handleBubblePointerDown}
        >
          <p className="dialog-page__result-label">ответ от нейропомощника:</p>
          <p
            className={`dialog-page__result-text${resultIsError ? ' dialog-page__result-text--error' : ''}`}
            aria-live="polite"
          >
            {resultText}
          </p>
          <p className="dialog-page__result-hint" aria-hidden="true">
            Удерживайте чтобы скрыть
          </p>
        </div>

        <div className="dialog-page__controls" role="group" aria-label="Действия с результатом">
          <RoundButton
            className="dialog-page__btn-retake"
            icon={<RotateCcw size={24} aria-hidden="true" />}
            aria-label="Переснять"
            onClick={handleRetake}
          />
          <RoundButton
            className="dialog-page__btn-cancel"
            icon={<X size={20} aria-hidden="true" />}
            aria-label="На главную"
            onClick={handleGoHome}
          />
          {mode === 'describe' && (
            <RoundButton
              variant="filled"
              icon={<MessageCircle size={20} aria-hidden="true" />}
              aria-label="Обсудить с нейропомощником"
              onClick={handleOpenChat}
            />
          )}
        </div>
      </main>
    );
  }

  // ── Chat phase ────────────────────────────────────────────────────────────
  return (
    <main
      id="main-content"
      className="dialog-page dialog-page--chat"
      tabIndex={-1}
      aria-label="Диалог о фото"
    >
      <header className="dialog-page__chat-header">
        <RoundButton
          icon={<X size={20} aria-hidden="true" />}
          aria-label="Выйти на главную"
          onClick={handleGoHome}
        />
        <h1 className="dialog-page__chat-title">Диалог о фото</h1>
      </header>

      <div className="dialog-page__messages" aria-live="polite" aria-label="Сообщения">
        {messages.map((msg, i) => (
          <div key={i} className={`dialog-page__bubble dialog-page__bubble--${msg.role}`}>
            {msg.role === 'assistant' && (
              <span className="dialog-page__bubble-label">нейропомощник</span>
            )}
            <p>{msg.text}</p>
          </div>
        ))}
        {isChatSending && (
          <div className="dialog-page__bubble dialog-page__bubble--assistant dialog-page__bubble--typing">
            <Loader2 size={16} className="dialog-page__spinner" aria-hidden="true" />
            <span className="sr-only">Нейропомощник печатает...</span>
          </div>
        )}
        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      <div className="dialog-page__chat-input" role="group" aria-label="Ввод сообщения">
        <RoundButton
          className="dialog-page__btn-voice"
          icon={<Mic size={20} aria-hidden="true" />}
          aria-label="Отправить голосовое сообщение"
          onClick={() => setVoiceOpen(true)}
          disabled={isChatSending}
        />
        <input
          className="dialog-page__input"
          type="text"
          placeholder="Задайте вопрос..."
          aria-label="Текст сообщения"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void sendChatText(chatInput);
            }
          }}
          disabled={isChatSending}
        />
        <RoundButton
          variant="filled"
          icon={
            isChatSending ? (
              <Loader2 size={20} className="dialog-page__spinner" aria-hidden="true" />
            ) : (
              <Send size={20} aria-hidden="true" />
            )
          }
          aria-label="Отправить сообщение"
          onClick={() => void sendChatText(chatInput)}
          disabled={isChatSending || !chatInput.trim()}
        />
      </div>

      {voiceOpen && (
        <VoiceRecordOverlay
          onClose={() => setVoiceOpen(false)}
          onSend={handleVoiceSend}
          isSending={sttMutation.isPending}
        />
      )}
    </main>
  );
};
