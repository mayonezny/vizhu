import {
  ConnectionError,
  DisconnectReason,
  Room,
  RoomEvent,
  Track,
  VideoPresets,
  type ConnectionQuality,
  type ConnectionState as LKConnectionState,
  type Participant,
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
  /** Идёт перезапуск камеры: <video> пустой, показывать его нельзя. */
  cameraSwitching: boolean;
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

/**
 * Раз в 5 секунд печатает реальные параметры видео: что фактически уходит
 * в сеть у публикующего и что приходит подписчику. Без этого спор «плохое
 * качество — это код или канал» не решается: WebRTC сам занижает поток, и
 * qualityLimitationReason прямо называет виновника (bandwidth / cpu / none).
 */
const startVideoStatsProbe = (room: Room, publishing: boolean): (() => void) => {
  let prevBytes = 0;
  let prevAt = 0;

  const tick = async () => {
    try {
      const pub = publishing
        ? room.localParticipant.getTrackPublication(Track.Source.Camera)
        : [...room.remoteParticipants.values()][0]?.getTrackPublication(Track.Source.Camera);
      const track = pub?.videoTrack;
      const stats: RTCStatsReport | undefined = await track?.getRTCStatsReport();
      if (!stats) {
        return;
      }
      // Выбранная ICE-пара. Ищем её строго по ссылке из transport-отчёта:
      // поле `nominated` в WebView может отсутствовать, а local-candidate'ов
      // в отчёте много — брать первый попавшийся нельзя, получается мусор.
      const byId = new Map<string, Record<string, unknown>>();
      let pairId: string | undefined;
      stats.forEach((report: Record<string, unknown>) => {
        byId.set(String(report.id), report);
        if (report.type === 'transport' && report.selectedCandidatePairId) {
          pairId = String(report.selectedCandidatePairId);
        }
      });
      let pair = pairId ? byId.get(pairId) : undefined;
      if (!pair) {
        // Safari/WKWebView не всегда заполняет transport.selectedCandidatePairId
        stats.forEach((report: Record<string, unknown>) => {
          if (report.type === 'candidate-pair' && (report.nominated || report.selected)) {
            pair = report;
          }
        });
      }
      const localCand = pair?.localCandidateId
        ? byId.get(String(pair.localCandidateId))
        : undefined;
      const transport = pair
        ? `${String(localCand?.protocol ?? pair.protocol ?? '?')}/${String(localCand?.candidateType ?? '?')}`
        : '?';
      const rtt =
        typeof pair?.currentRoundTripTime === 'number'
          ? Math.round(pair.currentRoundTripTime * 1000)
          : '?';
      // Прямая оценка доступной полосы — главный ответ на вопрос
      // «почему картинка мыльная»: по ней WebRTC и выбирает разрешение.
      const bweKbps =
        typeof pair?.availableOutgoingBitrate === 'number'
          ? Math.round(pair.availableOutgoingBitrate / 1000)
          : '?';

      const sourceFps = track?.mediaStreamTrack?.getSettings().frameRate;
      const wanted = publishing ? 'outbound-rtp' : 'inbound-rtp';
      stats.forEach((report: Record<string, unknown>) => {
        if (report.type !== wanted || report.kind !== 'video') {
          return;
        }
        const bytes = Number(publishing ? report.bytesSent : report.bytesReceived) || 0;
        const at = Number(report.timestamp) || Date.now();
        const kbps =
          prevAt && at > prevAt ? Math.round(((bytes - prevBytes) * 8) / (at - prevAt)) : 0;
        prevBytes = bytes;
        prevAt = at;
        lkLog(publishing ? 'отдаём:' : 'принимаем:', {
          size: `${String(report.frameWidth ?? '?')}x${String(report.frameHeight ?? '?')}`,
          fps: report.framesPerSecond ?? '?',
          kbps,
          limitedBy: report.qualityLimitationReason ?? 'n/a',
          // srcFps имеет смысл только у публикующего: это частота с камеры.
          // Отличает «сеть режет» от «источник и так медленный».
          ...(publishing ? { srcFps: sourceFps ?? '?', bweKbps } : {}),
          transport,
          rttMs: rtt,
          lost: report.packetsLost ?? 0,
        });
      });
    } catch {
      // статистика — вспомогательная вещь, её сбой не должен трогать звонок
    }
  };

  const id = setInterval(() => void tick(), 5000);
  return () => clearInterval(id);
};

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
        // 720p, а не 1080p: WebRTC угадывает ширину канала и стартует с
        // сотен килобит, разгоняясь до минуты. На такой полосе 1080p
        // пережимается в мыло, тогда как 720p-исходник остаётся резким —
        // а на хорошем канале разница для волонтёра почти незаметна.
        // (по умолчанию — задняя камера)
        videoCaptureDefaults: {
          resolution: VideoPresets.h720.resolution,
          facingMode: 'environment',
        },
        // Один поток, весь аплинк-битрейт в него. Меньше слоёв = меньше нагрузка
        // на CPU телефона незрячего = выше fps + нет залипания на 240p.
        publishDefaults: {
          simulcast: false,
          videoEncoding: {
            // 3 Мбит — потолок качественного 720p30. Больше на этом
            // разрешении почти не даёт выигрыша, зато дольше разгоняется
            // оценка полосы и выше шанс залипнуть на низком битрейте.
            maxBitrate: 3_000_000,
            maxFramerate: 30,
          },
          // 'balanced', а не 'maintain-resolution': последний при узком канале
          // цеплялся за 1080p и ронял частоту до 1-5 кадров в секунду —
          // волонтёр получал слайд-шоу и не мог направлять камеру голосом.
          // Пусть WebRTC сам решает, что резать: на хорошем канале останется
          // 1080p30, на плохом опустит разрешение, сохранив плавность.
          degradationPreference: 'balanced',
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
  const [cameraSwitching, setCameraSwitching] = useState(false);

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
    let stopStatsProbe: (() => void) | null = null;

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

    // Оценка канала от SFU. Падение до poor = сеть не тянет; в логе видно,
    // когда именно началась деградация и чем это кончилось.
    const handleQualityChanged = (quality: ConnectionQuality, participant: Participant) => {
      if (participant.isLocal) {
        lkLog('quality:', quality);
      }
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
      .on(RoomEvent.ConnectionQualityChanged, handleQualityChanged)
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
        stopStatsProbe = startVideoStatsProbe(room, canUseCamera);
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
      stopStatsProbe?.();
      room
        .off(RoomEvent.Connected, handleConnected)
        .off(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged)
        .off(RoomEvent.ConnectionQualityChanged, handleQualityChanged)
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
    if (!canUseCamera || cameraSwitching) {
      return;
    }
    const track = room.localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack;
    if (!track) {
      return;
    }
    const nextFacing: FacingMode = facingModeRef.current === 'environment' ? 'user' : 'environment';

    // Каскад constraints: фронтальные модули часто не отдают 1920x1080 (особенно
    // в WebView), и жёсткое требование 1080p роняло весь перезапуск — камера
    // просто не переключалась. Спускаемся до 720p, затем вовсе снимаем
    // требование к разрешению: лучше передняя камера в 480p, чем никакой.
    const attempts: Array<VideoCaptureOptions> = [
      { resolution: VideoPresets.h720.resolution, facingMode: nextFacing },
      { facingMode: nextFacing },
    ];

    const tryNext = async (index: number): Promise<void> => {
      try {
        await track.restartTrack(attempts[index]);
      } catch (error) {
        if (index + 1 < attempts.length) {
          lkLog('camera switch attempt failed, retrying with lower constraints:', error);
          await tryNext(index + 1);
          return;
        }
        throw error;
      }
    };

    setCameraSwitching(true);
    void tryNext(0)
      .then(() => {
        // Состояние меняем только по факту успеха: раньше оно обновлялось
        // заранее, и после неудачи следующее нажатие «переключало обратно»,
        // фактически не делая ничего.
        facingModeRef.current = nextFacing;
        setFacingMode(nextFacing);
        attachLocalVideo();
        announceRouteChange(nextFacing === 'environment' ? 'Задняя камера' : 'Передняя камера');
      })
      .catch((error: unknown) => {
        console.error('[livekit] не удалось переключить камеру', error);
        announceRouteChange('Не удалось переключить камеру');
      })
      .finally(() => setCameraSwitching(false));
  }, [room, canUseCamera, cameraSwitching, attachLocalVideo]);

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
    cameraSwitching,
    toggleMic,
    toggleCamera,
    switchCamera,
    leave,
    setRemoteVideoEl,
    setLocalVideoEl,
  };
};
