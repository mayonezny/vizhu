import { Mic, MicOff, PhoneOff, SwitchCamera, User, Video, VideoOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { useCallStore, useLiveKitRoom } from '@/features/calls';
import type { EndReason, MatchInfo } from '@/features/calls';
import type { UserRole } from '@/features/profile';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';

type CallRoomStageProps = {
  match: MatchInfo;
  role: UserRole;
};

const CONNECTION_LABEL: Record<string, string> = {
  connecting: 'Соединяем…',
  connected: 'На связи',
  reconnecting: 'Переподключаемся…',
  disconnected: 'Звонок завершён',
};

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export const CallRoomStage = ({ match, role }: CallRoomStageProps) => {
  const navigate = useNavigate();
  const endCall = useCallStore((s) => s.endCall);
  const returnToLine = useCallStore((s) => s.returnToLine);
  const finishedRef = useRef(false);
  const [seconds, setSeconds] = useState(0);

  const isBlind = role === 'blind';
  // Имена скрыты: стороны анонимны друг для друга.
  const remoteLabel = isBlind ? 'Волонтёр' : 'Собеседник';

  const finish = (reason: EndReason) => {
    if (finishedRef.current) {
      return;
    }
    finishedRef.current = true;
    // Незрячий — полностью выходим. Волонтёр остаётся на линии (снова в пул).
    if (isBlind) {
      endCall();
    } else {
      returnToLine();
    }
    const go = () => void navigate(isBlind ? '/help' : '/volunteer', { replace: true });
    if (reason === 'self') {
      announceRouteChange('Звонок завершён.');
      go();
    } else {
      // Собеседник ушёл — озвучиваем и уводим с задержкой, чтобы TTS успел сказать.
      announceRouteChange(reason === 'peer' ? 'Собеседник завершил звонок.' : 'Звонок завершён.');
      setTimeout(go, 1600);
    }
  };

  const {
    connectionState,
    micEnabled,
    cameraEnabled,
    remoteConnected,
    remoteVideoActive,
    canUseCamera,
    toggleMic,
    toggleCamera,
    switchCamera,
    leave,
    setRemoteVideoEl,
    setLocalVideoEl,
  } = useLiveKitRoom({ match, role, onDisconnected: finish });

  const handleEnd = () => {
    finish('self');
    leave();
  };

  // Секундомер разговора — со момента установления связи.
  useEffect(() => {
    if (connectionState !== 'connected') {
      return;
    }
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [connectionState]);

  return (
    <main id="main-content" className="call-room" tabIndex={-1} aria-label="Видеозвонок">
      <header className="call-room__top">
        <p className="call-room__conn" role="status" aria-live="polite">
          {CONNECTION_LABEL[connectionState] ?? ''}
        </p>
        <p className="call-room__timer" aria-label={`Длительность звонка ${formatTime(seconds)}`}>
          {formatTime(seconds)}
        </p>
      </header>

      {/* ─── Главная сцена: собеседник ─────────────────────────────────────── */}
      <section className="call-room__stage" aria-label={`Собеседник: ${remoteLabel}`}>
        {!isBlind && remoteVideoActive ? (
          <video
            ref={setRemoteVideoEl}
            className="call-room__remote-video"
            autoPlay
            playsInline
            muted
            aria-label={`Видео с камеры собеседника: ${remoteLabel}`}
          />
        ) : (
          <div className="call-room__card call-room__card--remote">
            <span className="call-room__avatar" aria-hidden="true">
              <User size={64} />
            </span>
            <p className="call-room__card-name">{remoteLabel}</p>
            <p className="call-room__card-sub">
              {remoteConnected
                ? isBlind
                  ? 'Волонтёр на связи, слушает вас'
                  : 'Камера выключена'
                : 'Ожидаем собеседника…'}
            </p>
          </div>
        )}

        <span className="call-room__stage-badge">{remoteLabel}</span>
      </section>

      {/* ─── Своя карточка (правый нижний угол) ────────────────────────────── */}
      <section
        className="call-room__self"
        aria-label={`Вы. ${micEnabled ? 'Микрофон включён' : 'Микрофон выключен'}`}
      >
        {isBlind && cameraEnabled ? (
          <video
            ref={setLocalVideoEl}
            className="call-room__self-video"
            autoPlay
            playsInline
            muted
            aria-label="Ваша камера — её видит волонтёр"
          />
        ) : (
          <span className="call-room__self-avatar" aria-hidden="true">
            <User size={28} />
          </span>
        )}
        <div className="call-room__self-meta">
          <span
            className={`call-room__self-mic${micEnabled ? '' : ' call-room__self-mic--off'}`}
            aria-hidden="true"
          >
            {micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
          </span>
          <span className="call-room__self-name">Вы</span>
        </div>
      </section>

      {/* ─── Управление ────────────────────────────────────────────────────── */}
      <div className="call-room__controls" role="group" aria-label="Управление звонком">
        <button
          type="button"
          className={`call-room__ctrl${micEnabled ? '' : ' call-room__ctrl--off'}`}
          onClick={toggleMic}
          aria-pressed={micEnabled}
          aria-label={micEnabled ? 'Выключить микрофон' : 'Включить микрофон'}
        >
          {micEnabled ? (
            <Mic size={26} aria-hidden="true" />
          ) : (
            <MicOff size={26} aria-hidden="true" />
          )}
          <span className="call-room__ctrl-label">Микрофон</span>
        </button>

        {canUseCamera && (
          <button
            type="button"
            className={`call-room__ctrl${cameraEnabled ? '' : ' call-room__ctrl--off'}`}
            onClick={toggleCamera}
            aria-pressed={cameraEnabled}
            aria-label={cameraEnabled ? 'Выключить камеру' : 'Включить камеру'}
          >
            {cameraEnabled ? (
              <Video size={26} aria-hidden="true" />
            ) : (
              <VideoOff size={26} aria-hidden="true" />
            )}
            <span className="call-room__ctrl-label">Камера</span>
          </button>
        )}

        {canUseCamera && (
          <button
            type="button"
            className="call-room__ctrl"
            onClick={switchCamera}
            disabled={!cameraEnabled}
            aria-label="Переключить камеру (передняя или задняя)"
          >
            <SwitchCamera size={26} aria-hidden="true" />
            <span className="call-room__ctrl-label">Сменить</span>
          </button>
        )}

        <button
          type="button"
          className="call-room__ctrl call-room__ctrl--end"
          onClick={handleEnd}
          aria-label="Завершить звонок"
        >
          <PhoneOff size={26} aria-hidden="true" />
          <span className="call-room__ctrl-label">Завершить</span>
        </button>
      </div>
    </main>
  );
};
