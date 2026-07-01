import {
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
} from 'livekit-client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { UserRole } from '@/features/profile';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';

import type { MatchInfo } from '../model/types';

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

type UseLiveKitRoomParams = {
  match: MatchInfo;
  role: UserRole;
  onDisconnected?: () => void;
};

export type LiveKitRoomState = {
  connectionState: ConnectionState;
  micEnabled: boolean;
  cameraEnabled: boolean;
  remoteName: string | null;
  remoteConnected: boolean;
  /** Собеседник публикует видео (актуально для волонтёра — видит камеру незрячего). */
  remoteVideoActive: boolean;
  canUseCamera: boolean;
  toggleMic: () => void;
  toggleCamera: () => void;
  leave: () => void;
  setRemoteVideoEl: (el: HTMLVideoElement | null) => void;
  setLocalVideoEl: (el: HTMLVideoElement | null) => void;
};

/**
 * Подключение к LiveKit-комнате и управление медиа по роли.
 *
 * - blind публикует камеру + микрофон, подписывается на аудио волонтёра.
 * - volunteer публикует только микрофон, видит видео + слышит аудио незрячего.
 *
 * Медиа-реконнект держит сам LiveKit — мы лишь озвучиваем смену состояния
 * (критично для незрячего, визуальные индикаторы бесполезны).
 */
export const useLiveKitRoom = ({
  match,
  role,
  onDisconnected,
}: UseLiveKitRoomParams): LiveKitRoomState => {
  const room = useMemo(() => new Room({ adaptiveStream: true, dynacast: true }), []);
  const canUseCamera = role === 'blind';

  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [micEnabled, setMicEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [remoteName, setRemoteName] = useState<string | null>(null);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [remoteVideoActive, setRemoteVideoActive] = useState(false);

  const remoteVideoElRef = useRef<HTMLVideoElement | null>(null);
  const localVideoElRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoTrackRef = useRef<RemoteTrack | null>(null);
  const localCameraTrackRef = useRef<Track | null>(null);
  const audioElsRef = useRef<Set<HTMLMediaElement>>(new Set());
  const everConnectedRef = useRef(false);
  const onDisconnectedRef = useRef(onDisconnected);
  onDisconnectedRef.current = onDisconnected;

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
      const remote = [...room.remoteParticipants.values()][0] as RemoteParticipant | undefined;
      setRemoteConnected(Boolean(remote));
      setRemoteName(remote?.name || null);
    };

    const handleSubscribed = (
      track: RemoteTrack,
      _pub: RemoteTrackPublication,
      participant: RemoteParticipant,
    ) => {
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
      setRemoteName(participant.name || null);
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
          onDisconnectedRef.current?.();
        }
      })
      .on(RoomEvent.TrackSubscribed, handleSubscribed)
      .on(RoomEvent.TrackUnsubscribed, handleUnsubscribed)
      .on(RoomEvent.ParticipantConnected, syncRemote)
      .on(RoomEvent.ParticipantDisconnected, () => {
        syncRemote();
        setRemoteVideoActive(false);
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
          await room.localParticipant.setCameraEnabled(true);
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
    void room.localParticipant.setCameraEnabled(next).then(() => {
      const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      localCameraTrackRef.current = camPub?.track ?? null;
      attachLocalVideo();
    });
    setCameraEnabled(next);
    announceRouteChange(next ? 'Камера включена' : 'Камера выключена');
  }, [room, canUseCamera, attachLocalVideo]);

  const leave = useCallback(() => {
    void room.disconnect();
    // Явное «Завершить» уводит с экрана всегда, даже если коннект не поднялся.
    onDisconnectedRef.current?.();
  }, [room]);

  return {
    connectionState,
    micEnabled,
    cameraEnabled,
    remoteName,
    remoteConnected,
    remoteVideoActive,
    canUseCamera,
    toggleMic,
    toggleCamera,
    leave,
    setRemoteVideoEl,
    setLocalVideoEl,
  };
};
