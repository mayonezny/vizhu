import { STORAGE_KEYS } from '@/shared/config/storage-keys';
import { createPersistedStore } from '@/shared/lib/zustand';

export type VisionType = 'blind' | 'low_vision' | 'helper' | 'exploring';

interface RegistrationState {
  name: string;
  age: string;
  visionType: VisionType | null;
  ipraVerified: boolean;
}

interface RegistrationActions {
  setName: (name: string) => void;
  setAge: (age: string) => void;
  setVisionType: (type: VisionType) => void;
  setIpraVerified: (verified: boolean) => void;
  reset: () => void;
}

type RegistrationStore = RegistrationState & RegistrationActions;

export const useRegistrationStore = createPersistedStore<RegistrationStore>(
  'Registration',
  (set) => ({
    name: '',
    age: '',
    visionType: null,
    ipraVerified: false,
    setName: (name) =>
      set((draft) => {
        draft.name = name;
      }),
    setAge: (age) =>
      set((draft) => {
        draft.age = age;
      }),
    setVisionType: (type) =>
      set((draft) => {
        draft.visionType = type;
      }),
    setIpraVerified: (verified) =>
      set((draft) => {
        draft.ipraVerified = verified;
      }),
    reset: () =>
      set((draft) => {
        draft.name = '';
        draft.age = '';
        draft.visionType = null;
        draft.ipraVerified = false;
      }),
  }),
  { name: STORAGE_KEYS.REGISTRATION },
);
