import { useEffect } from 'react';
import { useNavigate } from 'react-router';

import { useOnboardingStore } from '@/features/onboarding';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';
import { SuccessScreen } from '@/shared/ui/SuccessScreen';

export const WelcomePage = () => {
  const navigate = useNavigate();
  const markSeen = useOnboardingStore((s) => s.markSeen);

  useEffect(() => {
    announceRouteChange('Добро пожаловать! Аккаунт создан.');
  }, []);

  const handleTour = () => void navigate('/onboarding', { replace: true });

  const handleSkip = () => {
    markSeen();
    void navigate('/', { replace: true });
  };

  return (
    <SuccessScreen
      title="Добро пожаловать!"
      subtitle="Сейчас покажем, как пользоваться. Можно пропустить — голосовые подсказки доступны в любой момент."
      primaryLabel="Далее"
      onPrimary={handleTour}
      secondaryLabel="Пропустить"
      onSecondary={handleSkip}
    />
  );
};
