import {
  Room,
  RoomEvent,
  Track,
  VideoPresets,
  type RemoteTrack,
  type VideoCaptureOptions,
} from 'livekit-client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { UserRole } from '@/features/profile';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';

import type { MatchInfo } from '../model/types';

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

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
 * Подключение к LiveKit-комнате и управление медиа по роли.
 *
 * - blind публикует камеру (по умолчанию задняя) + микрофон, подписывается на аудио волонтёра.
 * - volunteer публикует только микрофон, видит видео + слышит аудио незрячего.
 *
 * Качество: захват 720p + simulcast-слои до 720p, чтобы волонтёр получал резкую
 * картинку. Медиа-реконнект держит сам LiveKit — мы озвучиваем смену состояния.
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

    room
      .on(RoomEvent.Connected, () => {
        if (cancelled) {
          return;
        }
        everConnectedRef.current = true;
        setConnectionState('connected');
        syncRemote();
      })
      .on(RoomEvent.Reconnecting, () => {
        setConnectionState('reconnecting');
        announceRouteChange('Связь прерывается, переподключаемся…');
      })
      .on(RoomEvent.Reconnected, () => {
        setConnectionState('connected');
        announceRouteChange('Связь восстановлена');
      })
      .on(RoomEvent.Disconnected, () => {
        setConnectionState('disconnected');
        // Уводим с экрана только если связь была установлена (естественное
        // завершение). Провал первичного коннекта — остаёмся, показываем статус.
        if (everConnectedRef.current) {
          onDisconnectedRef.current?.('closed');
        }
      })
      .on(RoomEvent.TrackSubscribed, handleSubscribed)
      .on(RoomEvent.TrackUnsubscribed, handleUnsubscribed)
      .on(RoomEvent.ParticipantConnected, syncRemote)
      .on(RoomEvent.ParticipantDisconnected, () => {
        syncRemote();
        setRemoteVideoActive(false);
        // Собеседник ушёл — на двоих комната опустела, звонок окончен.
        if (room.remoteParticipants.size === 0) {
          setConnectionState('disconnected');
          onDisconnectedRef.current?.('peer');
        }
      })
      .on(RoomEvent.LocalTrackPublished, syncLocalState)
      .on(RoomEvent.LocalTrackUnpublished, syncLocalState)
      .on(RoomEvent.TrackMuted, syncLocalState)
      .on(RoomEvent.TrackUnmuted, syncLocalState);

    const connect = async () => {
      try {
        await room.connect(match.url, match.token);
        if (cancelled) {
          return;
        }
        await room.localParticipant.setMicrophoneEnabled(true);
        if (canUseCamera) {
          await room.localParticipant.setCameraEnabled(true, captureOptions());
        }
        syncLocalState();
        syncRemote();
      } catch {
        if (!cancelled) {
          setConnectionState('disconnected');
          announceRouteChange('Не удалось подключиться к звонку.');
        }
      }
    };

    void connect();

    const audioEls = audioElsRef.current;
    return () => {
      cancelled = true;
      audioEls.forEach((el) => el.remove());
      audioEls.clear();
      void room.disconnect();
    };
  }, [room, match.url, match.token, canUseCamera, attachLocalVideo, attachRemoteVideo]);

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
    void room.disconnect();
  }, [room]);

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
