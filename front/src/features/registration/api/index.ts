import { api } from '@/shared/api';

import type { VisionType } from '../model/registration.store';

export type RegistrationPayload = {
  name: string;
  age: number;
  vision_type: VisionType;
  ipra_verified: boolean;
};

export const registrationApi = {
  register: (payload: RegistrationPayload) => api.post<{ ok: true }>('/registration', payload),
};
