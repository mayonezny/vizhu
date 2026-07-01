import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth';

import { profileApi, type Profile } from '../api';

export const profileQueryKey = ['profile'] as const;

/** Профиль текущего пользователя. Кэшируется react-query — можно дёргать из
 * любого места (навигация, кабинет, звонок) без повторных запросов. */
export const useProfile = () => {
  const isAuthed = useAuthStore((s) => s.isAuthed);

  return useQuery<Profile>({
    queryKey: profileQueryKey,
    queryFn: async () => (await profileApi.getProfile()).data,
    enabled: isAuthed,
    staleTime: 5 * 60 * 1000,
  });
};

/** Является ли текущий пользователь волонтёром (для гейтинга UI). */
export const useIsVolunteer = (): boolean => {
  const { data } = useProfile();
  return data?.role === 'volunteer';
};
