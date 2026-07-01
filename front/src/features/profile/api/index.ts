import { api } from '@/shared/api';

export type UserRole = 'blind' | 'volunteer';

export type BlindnessTypeRef = {
  id: number;
  name: string;
};

/** Плоский профиль текущего пользователя (см. GET /profile на бэке). */
export type Profile = {
  uuid: string;
  name: string;
  age: number | null;
  role: UserRole;
  phone: string | null;
  blindnessType: BlindnessTypeRef | null;
  isVerified: boolean;
  createdAt: string;
};

export const profileApi = {
  getProfile: () => api.get<Profile>('/profile'),
};
