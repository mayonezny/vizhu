import { ArrowBigLeft, Sun } from 'lucide-react';
import { useNavigate } from 'react-router';

import { useTheme } from '@/shared/lib/theme';
import { RoundButton } from '@/shared/ui/RoundButton';

interface TitleHeaderProps {
  title: string;
}

export const TitleHeader = ({ title }: TitleHeaderProps) => {
  const { toggle } = useTheme();
  const navigate = useNavigate();

  return (
    <>
      <RoundButton
        icon={<ArrowBigLeft size={24} />}
        aria-label="Назад"
        onClick={() => navigate(-1)}
      />
      <h1 className="page-layout__title">{title}</h1>
      <RoundButton icon={<Sun size={24} />} aria-label="Сменить тему" onClick={toggle} />
    </>
  );
};
