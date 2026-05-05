import { Sun } from 'lucide-react';

import { useTheme } from '@/shared/lib/theme';
import { Logo } from '@/shared/ui/Logo';
import { RoundButton } from '@/shared/ui/RoundButton';

export const LogoHeader = () => {
  const { toggle } = useTheme();

  return (
    <>
      <Logo />
      <RoundButton icon={<Sun size={24} />} aria-label="Кнопка смены темы" onClick={toggle} />
    </>
  );
};
