import {
  ConnectionError,
  DisconnectReason,
  Room,
  RoomEvent,
  Track,
  VideoPresets,
  type ConnectionState as LKConnectionState,
  type RemoteParticipant,
  type RemoteTrack,
  type VideoCaptureOptions,
} from 'livekit-client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { UserRole } from '@/features/profile';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';

import type { MatchInfo } from '../model/types';

export type ConnectionState =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'failed';

/** Причина завершения: сам положил трубку / собеседник ушёл / комната закрылась. */
export type EndReason = 'self' | 'peer' | 'closed';

type FacingMode = 'environment' | 'user';

type UseLiveKitRoomParams = {
  match: MatchInfo;
  role: UserRole;
  onDisconnected?: (reason: EndReason) => void;
};

export type LiveKitRoomState = {
  connectionState: ConnectionState;
  micEnabled: boolean;
  cameraEnabled: boolean;
  remoteConnected: boolean;
  /** Собеседник публикует видео (актуально для волонтёра — видит камеру незрячего). */
  remoteVideoActive: boolean;
  canUseCamera: boolean;
  facingMode: FacingMode;
  toggleMic: () => void;
  toggleCamera: () => void;
  switchCamera: () => void;
  leave: () => void;
  setRemoteVideoEl: (el: HTMLVideoElement | null) => void;
  setLocalVideoEl: (el: HTMLVideoElement | null) => void;
};

/**
 * Диагностика звонка. В нативной сборке DevTools под рукой не всегда, и
 * `console.*` — единственный способ увидеть в logcat, на каком шаге встало
 * соединение. Правило no-console запрещает info — здесь осознанное исключение
 * на один хелпер, чтобы не глушить правило по всему проекту.
 */
// eslint-disable-next-line no-console
const lkLog = (...args: unknown[]): void => console.info('[livekit]', ...args);

/** Человекочитаемая причина отключения — иначе в логах пусто и отладка вслепую. */
const disconnectReasonName = (reason?: DisconnectReason): string =>
  reason === undefined ? 'unknown' : (DisconnectReason[reason] ?? String(reason));

const describeConnectError = (error: unknown): string => {
  if (error instanceof ConnectionError) {
    return `${error.reason !== undefined ? String(error.reason) : 'unknown'}: ${error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
};

/**
 * Подключение к LiveKit-комнате и управление медиа по роли.
 *
 * - blind публикует камеру (по умолчанию задняя) + микрофон, подписывается на аудио волонтёра.
 * - volunteer публикует только микрофон, видит видео + слышит аудио незрячего.
 *
 * Качество: захват 720p + один поток без simulcast, чтобы волонтёр получал резкую
 * картинку. Медиа-реконнект держит сам LiveKit — мы озвучиваем смену состояния.
 *
 * Важно про жизненный цикл: `Room` создаётся один раз на монтирование, а
 * connect/disconnect строго сериализованы (см. runExclusive). Иначе повторный
 * прогон эффекта (StrictMode в деве, смена зависимостей, ремоунт страницы)
 * даёт наложение «отключаемся» и «подключаемся» на одном инстансе: соединение
 * зависает в connecting, а на сервере на миг появляется второй участник с тем
 * же identity — из-за лимита участников второй стороне не остаётся места.
 */
export const useLiveKitRoom = ({
  match,
  role,
  onDisconnected,
}: UseLiveKitRoomParams): LiveKitRoomState => {
  const canUseCamera = role === 'blind';
  const room = useMemo(
    () =>
      new Room({
        // Звонок 1-на-1: adaptiveStream/dynacast/simulcast только мешают —
        // они рассчитаны на SFU с многими подписчиками. Отключаем, чтобы
        // волонтёр всегда получал единственный полноценный поток.
        adaptiveStream: false,
        dynacast: false,
        // Захватываем камеру в 720p (по умолчанию — задняя).
        videoCaptureDefaults: {
          resolution: VideoPresets.h720.resolution,
          facingMode: 'environment',
        },
        // Один поток, весь аплинк-битрейт в него. Меньше слоёв = меньше нагрузка
        // на CPU телефона незрячего = выше fps + нет залипания на 240p.
        publishDefaults: {
          simulcast: false,
          videoEncoding: {
            maxBitrate: 3_000_000,
            maxFramerate: 30,
          },
          degradationPreference: 'maintain-framerate',
          red: true,
          dtx: true,
        },
      }),
    [],
  );

  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [micEnabled, setMicEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [remoteVideoActive, setRemoteVideoActive] = useState(false);
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');

  const remoteVideoElRef = useRef<HTMLVideoElement | null>(null);
  const localVideoElRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoTrackRef = useRef<RemoteTrack | null>(null);
  const localCameraTrackRef = useRef<Track | null>(null);
  const audioElsRef = useRef<Set<HTMLMediaElement>>(new Set());
  const facingModeRef = useRef<FacingMode>('environment');
  const everConnectedRef = useRef(false);
  const onDisconnectedRef = useRef(onDisconnected);
  onDisconnectedRef.current = onDisconnected;

  /**
   * Очередь операций над комнатой: connect и disconnect никогда не выполняются
   * параллельно, а cleanup всегда дожидается завершения своего connect.
   */
  const chainRef = useRef<Promise<unknown>>(Promise.resolve());
  const runExclusive = useCallback((task: () => Promise<void>): Promise<void> => {
    const next = chainRef.current.then(task, task);
    chainRef.current = next.catch(() => {});
    return next;
  }, []);

  const captureOptions = (): VideoCaptureOptions => ({
    resolution: VideoPresets.h720.resolution,
    facingMode: facingModeRef.current,
  });

  const attachRemoteVideo = useCallback(() => {
    const track = remoteVideoTrackRef.current;
    const el = remoteVideoElRef.current;
    if (track && el) {
      track.attach(el);
    }
  }, []);

  const attachLocalVideo = useCallback(() => {
    const track = localCameraTrackRef.current;
    const el = localVideoElRef.current;
    if (track && el && 'attach' in track) {
      (track as Track).attach(el);
    }
  }, []);

  const setRemoteVideoEl = useCallback(
    (el: HTMLVideoElement | null) => {
      remoteVideoElRef.current = el;
      attachRemoteVideo();
    },
    [attachRemoteVideo],
  );

  const setLocalVideoEl = useCallback(
    (el: HTMLVideoElement | null) => {
      localVideoElRef.current = el;
      attachLocalVideo();
    },
    [attachLocalVideo],
  );

  useEffect(() => {
    let cancelled = false;

    const syncLocalState = () => {
      setMicEnabled(room.localParticipant.isMicrophoneEnabled);
      setCameraEnabled(room.localParticipant.isCameraEnabled);
      const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      localCameraTrackRef.current = camPub?.track ?? null;
      attachLocalVideo();
    };

    const syncRemote = () => {
      setRemoteConnected(room.remoteParticipants.size > 0);
    };

    const handleConnected = () => {
      if (cancelled) {
        return;
      }
      everConnectedRef.current = true;
      setConnectionState('connected');
      lkLog('connected', {
        room: room.name,
        identity: room.localParticipant.identity,
        peers: room.remoteParticipants.size,
      });
      syncRemote();
    };

    // Низкоуровневое состояние соединения: показывает, дошло ли дело до
    // медиа-канала. Зависание на 'connecting' = не встал PeerConnection (ICE),
    // а не сигналинг — по логу это видно сразу.
    const handleConnectionStateChanged = (state: LKConnectionState) => {
      lkLog('state:', state);
    };

    const handleReconnecting = () => {
      setConnectionState('reconnecting');
      announceRouteChange('Связь прерывается, переподключаемся…');
    };

    const handleReconnected = () => {
      setConnectionState('connected');
      announceRouteChange('Связь восстановлена');
    };

    const handleRoomDisconnected = (reason?: DisconnectReason) => {
      console.warn('[livekit] disconnected:', disconnectReasonName(reason));
      setConnectionState('disconnected');
      // Уводим с экрана только если связь была установлена (естественное
      // завершение). Провал первичного коннекта — остаёмся, показываем статус.
      if (everConnectedRef.current) {
        onDisconnectedRef.current?.('closed');
      }
    };

    const handleSubscribed = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video) {
        remoteVideoTrackRef.current = track;
        setRemoteVideoActive(true);
        attachRemoteVideo();
      } else if (track.kind === Track.Kind.Audio) {
        const el = track.attach();
        el.style.display = 'none';
        document.body.appendChild(el);
        audioElsRef.current.add(el);
      }
    };

    const handleUnsubscribed = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video) {
        setRemoteVideoActive(false);
        remoteVideoTrackRef.current = null;
      }
      track.detach().forEach((el) => {
        audioElsRef.current.delete(el);
        el.remove();
      });
    };

    const handleParticipantConnected = (participant: RemoteParticipant) => {
      lkLog('peer joined:', participant.identity);
      syncRemote();
    };

    const handleParticipantDisconnected = (participant: RemoteParticipant) => {
      lkLog('peer left:', participant.identity);
      syncRemote();
      setRemoteVideoActive(false);
      // Собеседник ушёл — на двоих комната опустела, звонок окончен.
      if (room.remoteParticipants.size === 0) {
        setConnectionState('disconnected');
        onDisconnectedRef.current?.('peer');
      }
    };

    room
      .on(RoomEvent.Connected, handleConnected)
      .on(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged)
      .on(RoomEvent.Reconnecting, handleReconnecting)
      .on(RoomEvent.Reconnected, handleReconnected)
      .on(RoomEvent.Disconnected, handleRoomDisconnected)
      .on(RoomEvent.TrackSubscribed, handleSubscribed)
      .on(RoomEvent.TrackUnsubscribed, handleUnsubscribed)
      .on(RoomEvent.ParticipantConnected, handleParticipantConnected)
      .on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
      .on(RoomEvent.LocalTrackPublished, syncLocalState)
      .on(RoomEvent.LocalTrackUnpublished, syncLocalState)
      .on(RoomEvent.TrackMuted, syncLocalState)
      .on(RoomEvent.TrackUnmuted, syncLocalState);

    void runExclusive(async () => {
      if (cancelled) {
        return;
      }
      try {
        lkLog('connecting to', match.url, 'room', match.room, 'as', role);
        await room.connect(match.url, match.token);
        if (cancelled) {
          return;
        }
        // Микрофон и камера — уже после установления связи: отказ в доступе
        // к устройствам не должен выглядеть как «не удалось подключиться».
        try {
          await room.localParticipant.setMicrophoneEnabled(true);
          if (canUseCamera) {
            await room.localParticipant.setCameraEnabled(true, captureOptions());
          }
        } catch (mediaError) {
          console.error('[livekit] публикация медиа не удалась', mediaError);
          announceRouteChange('Нет доступа к микрофону или камере. Проверьте разрешения.');
        }
        syncLocalState();
        syncRemote();
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error('[livekit] connect failed:', describeConnectError(error));
        setConnectionState('failed');
        announceRouteChange('Не удалось подключиться к звонку.');
      }
    });

    const audioEls = audioElsRef.current;
    return () => {
      cancelled = true;
      room
        .off(RoomEvent.Connected, handleConnected)
        .off(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged)
        .off(RoomEvent.Reconnecting, handleReconnecting)
        .off(RoomEvent.Reconnected, handleReconnected)
        .off(RoomEvent.Disconnected, handleRoomDisconnected)
        .off(RoomEvent.TrackSubscribed, handleSubscribed)
        .off(RoomEvent.TrackUnsubscribed, handleUnsubscribed)
        .off(RoomEvent.ParticipantConnected, handleParticipantConnected)
        .off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
        .off(RoomEvent.LocalTrackPublished, syncLocalState)
        .off(RoomEvent.LocalTrackUnpublished, syncLocalState)
        .off(RoomEvent.TrackMuted, syncLocalState)
        .off(RoomEvent.TrackUnmuted, syncLocalState);
      audioEls.forEach((el) => el.remove());
      audioEls.clear();
      // Отключаемся строго после того, как отработает наш connect — иначе
      // «висячий» disconnect убьёт уже следующее соединение.
      void runExclusive(() => room.disconnect());
    };
  }, [
    room,
    match.url,
    match.token,
    match.room,
    role,
    canUseCamera,
    attachLocalVideo,
    attachRemoteVideo,
    runExclusive,
  ]);

  const toggleMic = useCallback(() => {
    const next = !room.localParticipant.isMicrophoneEnabled;
    void room.localParticipant.setMicrophoneEnabled(next);
    setMicEnabled(next);
    announceRouteChange(next ? 'Микрофон включён' : 'Микрофон выключен');
  }, [room]);

  const toggleCamera = useCallback(() => {
    if (!canUseCamera) {
      return;
    }
    const next = !room.localParticipant.isCameraEnabled;
    void room.localParticipant.setCameraEnabled(next, captureOptions()).then(() => {
      const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      localCameraTrackRef.current = camPub?.track ?? null;
      attachLocalVideo();
    });
    setCameraEnabled(next);
    announceRouteChange(next ? 'Камера включена' : 'Камера выключена');
  }, [room, canUseCamera, attachLocalVideo]);

  const switchCamera = useCallback(() => {
    if (!canUseCamera) {
      return;
    }
    const nextFacing: FacingMode = facingModeRef.current === 'environment' ? 'user' : 'environment';
    facingModeRef.current = nextFacing;
    setFacingMode(nextFacing);
    const track = room.localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack;
    if (track) {
      void track
        .restartTrack({ resolution: VideoPresets.h720.resolution, facingMode: nextFacing })
        .then(() => attachLocalVideo());
    }
    announceRouteChange(nextFacing === 'environment' ? 'Задняя камера' : 'Передняя камера');
  }, [room, canUseCamera, attachLocalVideo]);

  const leave = useCallback(() => {
    void runExclusive(() => room.disconnect());
  }, [room, runExclusive]);

  return {
    connectionState,
    micEnabled,
    cameraEnabled,
    remoteConnected,
    remoteVideoActive,
    canUseCamera,
    facingMode,
    toggleMic,
    toggleCamera,
    switchCamera,
    leave,
    setRemoteVideoEl,
    setLocalVideoEl,
  };
};
