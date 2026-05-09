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
      const mimeType = MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : 'audio/webm;codecs=opus';
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
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
