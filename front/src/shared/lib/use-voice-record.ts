import { useCallback, useRef, useState } from 'react';

export type VoiceRecordStatus = 'idle' | 'requesting' | 'recording' | 'stopped';
export type VoiceRecordError = 'permission_denied' | 'not_found' | 'unknown';

export type UseVoiceRecordReturn = {
  status: VoiceRecordStatus;
  audioBlob: Blob | null;
  analyserNode: AnalyserNode | null;
  error: VoiceRecordError | null;
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
};

/**
 * Контейнеры в порядке предпочтения. Первые два — то, что понимает Chrome и
 * Android WebView, третий — единственный формат MediaRecorder в Safari/WKWebView:
 * ogg и webm там не поддерживаются вовсе, и жёсткий запрос такого типа ронял
 * конструктор с NotSupportedError, то есть на iOS запись не работала совсем.
 */
const MIME_CANDIDATES = ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/mp4'];

const pickMimeType = (): string | undefined => {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return undefined;
  }
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
};

function classifyError(err: unknown): VoiceRecordError {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      return 'permission_denied';
    }
    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      return 'not_found';
    }
  }
  return 'unknown';
}

export function useVoiceRecord(): UseVoiceRecordReturn {
  const [status, setStatus] = useState<VoiceRecordStatus>('idle');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [error, setError] = useState<VoiceRecordError | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const teardown = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    streamRef.current = null;
    recorderRef.current = null;
    audioCtxRef.current = null;
    setAnalyserNode(null);
  }, []);

  const start = useCallback(async () => {
    setStatus('requesting');
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      setAnalyserNode(analyser);

      chunksRef.current = [];
      // Ни один кандидат не подошёл — отдаём выбор браузеру, он возьмёт
      // свой дефолтный контейнер (в Safari это audio/mp4).
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        // recorder.mimeType — фактический контейнер; на части браузеров он
        // пустой, тогда берём запрошенный. Бэку важен именно реальный тип.
        const type = recorder.mimeType || mimeType || 'audio/mp4';
        const blob = new Blob(chunksRef.current, { type });
        setAudioBlob(blob);
        setStatus('stopped');
      };

      recorder.start();
      setStatus('recording');
    } catch (err) {
      setError(classifyError(err));
      setStatus('idle');
    }
  }, []);

  const stop = useCallback(() => {
    if (recorderRef.current?.state !== 'inactive') {
      recorderRef.current?.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    streamRef.current = null;
    recorderRef.current = null;
    audioCtxRef.current = null;
    setAnalyserNode(null);
  }, []);

  const cancel = useCallback(() => {
    teardown();
    setAudioBlob(null);
    setError(null);
    setStatus('idle');
  }, [teardown]);

  return { status, audioBlob, analyserNode, error, start, stop, cancel };
}
