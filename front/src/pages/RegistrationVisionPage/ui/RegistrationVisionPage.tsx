import { ChevronLeft } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';

import { useRegistrationStore, type VisionType } from '@/features/registration';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';
import { Button } from '@/shared/ui/Button';
import { RadioCardGroup, type RadioCardOption } from '@/shared/ui/RadioCardGroup';
import { RoundButton } from '@/shared/ui/RoundButton';

import './RegistrationVisionPage.scss';

const OPTIONS: RadioCardOption<VisionType>[] = [
  { value: 'blind', label: 'Незрячий', subtitle: 'Полная озвучка, экран затемнён' },
  {
    value: 'low_vision',
    label: 'Плохое зрение',
    subtitle: 'Очень крупный шрифт, высокий контраст',
  },
  { value: 'helper', label: 'Помогаю близкому', subtitle: 'Стандартный интерфейс, AI-помощь' },
  { value: 'exploring', label: 'Другое', subtitle: 'Режим без подстроек' },
];

export const RegistrationVisionPage = () => {
  const navigate = useNavigate();
  const visionType = useRegistrationStore((s) => s.visionType);
  const setVisionType = useRegistrationStore((s) => s.setVisionType);

  useEffect(() => {
    announceRouteChange('Шаг 3 из 4. Выберите, какое у вас зрение');
  }, []);

  const handleNext = () => {
    if (!visionType) {
      return;
    }
    void navigate('/registration/ipra');
  };

  return (
    <main id="main-content" className="reg-vision" tabIndex={-1} aria-labelledby="reg-vision-title">
      <div className="reg-vision__back">
        <RoundButton
          aria-label="Назад"
          icon={<ChevronLeft size={24} />}
          onClick={() => void navigate('/registration/name')}
        />
      </div>

      <div className="reg-vision__head">
        <h1 id="reg-vision-title" className="reg-vision__title">
          Ваше зрение?
        </h1>
        <p className="reg-vision__desc">
          Подбираем размер шрифта, контраст и поведение интерфейса. Ответ можно изменить в любой
          момент.
        </p>
      </div>

      <RadioCardGroup
        name="visionType"
        options={OPTIONS}
        value={visionType}
        onChange={setVisionType}
        className="reg-vision__options"
      />

      <Button onClick={handleNext} disabled={!visionType} aria-label="Перейти к следующему шагу">
        Дальше
      </Button>
    </main>
  );
};
