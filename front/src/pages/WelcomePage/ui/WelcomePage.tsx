import { useEffect } from 'react';
import { useNavigate } from 'react-router';

import { useAuthStore } from '@/features/auth';
import { useOnboardingStore } from '@/features/onboarding';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';
import { SuccessScreen } from '@/shared/ui/SuccessScreen';

export const WelcomePage = () => {
  const navigate = useNavigate();
  const userName = useAuthStore((s) => s.userName);
  const hasSeen = useOnboardingStore((s) => s.hasSeen);

  useEffect(() => {
    announceRouteChange('Добро пожаловать! Вход выполнен успешно.');
  }, []);

  const handleTour = () => void navigate('/onboarding', { replace: true });
  const handleSkip = () => void navigate('/', { replace: true });

  return (
    <SuccessScreen
      userName={userName ?? undefined}
      title="Добро пожаловать!"
      subtitle="Сейчас покажем, как пользоваться. Можно пропустить — голосовые подсказки доступны в любой момент."
      primaryLabel={hasSeen ? 'Перейти к помощи' : 'Показать тур'}
      onPrimary={hasSeen ? handleSkip : handleTour}
      secondaryLabel={hasSeen ? undefined : 'Сразу к помощи'}
      onSecondary={hasSeen ? undefined : handleSkip}
    />
  );
};
