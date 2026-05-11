import { STORAGE_KEYS } from '@/shared/config/storage-keys';
import { createPersistedStore } from '@/shared/lib/zustand';

interface RegistrationState {
  name: string;
  age: string;
  blindnessTypeId: number | null;
}

interface RegistrationActions {
  setName: (name: string) => void;
  setAge: (age: string) => void;
  setBlindnessTypeId: (id: number) => void;
  reset: () => void;
}

type RegistrationStore = RegistrationState & RegistrationActions;

export const useRegistrationStore = createPersistedStore<RegistrationStore>(
  'Registration',
  (set) => ({
    name: '',
    age: '',
    blindnessTypeId: null,
    setName: (name) =>
      set((draft) => {
        draft.name = name;
      }),
    setAge: (age) =>
      set((draft) => {
        draft.age = age;
      }),
    setBlindnessTypeId: (id) =>
      set((draft) => {
        draft.blindnessTypeId = id;
      }),
    reset: () =>
      set((draft) => {
        draft.name = '';
        draft.age = '';
        draft.blindnessTypeId = null;
      }),
  }),
  { name: STORAGE_KEYS.REGISTRATION },
);
