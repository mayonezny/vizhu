import { STORAGE_KEYS } from '@/shared/config/storage-keys';
import { createPersistedStore } from '@/shared/lib/zustand';

interface OnboardingState {
  hasSeen: boolean;
}

interface OnboardingActions {
  markSeen: () => void;
  reset: () => void;
}

type OnboardingStore = OnboardingState & OnboardingActions;

export const useOnboardingStore = createPersistedStore<OnboardingStore>(
  'Onboarding',
  (set) => ({
    hasSeen: false,
    markSeen: () =>
      set((draft) => {
        draft.hasSeen = true;
      }),
    reset: () =>
      set((draft) => {
        draft.hasSeen = false;
      }),
  }),
  { name: STORAGE_KEYS.ONBOARDING },
);
