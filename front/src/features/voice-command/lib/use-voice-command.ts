import { useMutation } from '@tanstack/react-query';

import { voiceCommandApi } from '../api';

export const useVoiceCommand = () => {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ blob, mimeType }: { blob: Blob; mimeType: string }) => {
      const { text } = await voiceCommandApi.stt(blob, mimeType);
      const { command } = await voiceCommandApi.classify(text);
      return { text, command };
    },
  });

  const processAudio = (blob: Blob, mimeType: string) => mutateAsync({ blob, mimeType });

  return { processAudio, isSending: isPending };
};
