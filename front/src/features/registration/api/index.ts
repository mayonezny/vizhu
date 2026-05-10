import { api } from '@/shared/api';

export type BlindnessType = {
  id: number;
  name: string;
};

export type ProfilePayload = {
  name: string;
  age?: number;
  blindnessTypeId?: number;
};

export const registrationApi = {
  getBlindnessTypes: () => api.get<BlindnessType[]>('/blindness-types'),

  createProfile: (payload: ProfilePayload) => api.post<void>('/profile', payload),
};
