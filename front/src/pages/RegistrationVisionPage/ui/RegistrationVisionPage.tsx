import { ChevronLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { registrationApi, useRegistrationStore, type BlindnessType } from '@/features/registration';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';
import { Button } from '@/shared/ui/Button';
import { RadioCardGroup, type RadioCardOption } from '@/shared/ui/RadioCardGroup';
import { RoundButton } from '@/shared/ui/RoundButton';

import './RegistrationVisionPage.scss';

export const RegistrationVisionPage = () => {
  const navigate = useNavigate();
  const blindnessTypeId = useRegistrationStore((s) => s.blindnessTypeId);
  const setBlindnessTypeId = useRegistrationStore((s) => s.setBlindnessTypeId);

  const [options, setOptions] = useState<RadioCardOption<string>[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    announceRouteChange('Шаг 2 из 4. Выберите, какое у вас зрение');
  }, []);

  useEffect(() => {
    registrationApi
      .getBlindnessTypes()
      .then(({ data }) => {
        setOptions(data.map((t: BlindnessType) => ({ value: String(t.id), label: t.name })));
      })
      .catch(() => {
        // Keep empty — user can retry or skip
      })
      .finally(() => setIsLoading(false));
  }, []);

  const selectedValue = blindnessTypeId !== null ? String(blindnessTypeId) : null;

  const handleChange = (value: string) => {
    setBlindnessTypeId(Number(value));
  };

  const handleNext = () => {
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

      {isLoading ? (
        <p className="reg-vision__loading" aria-live="polite">
          Загружаем варианты...
        </p>
      ) : (
        <RadioCardGroup
          name="blindnessType"
          options={options}
          value={selectedValue}
          onChange={handleChange}
          className="reg-vision__options"
        />
      )}

      <Button onClick={handleNext} aria-label="Перейти к следующему шагу">
        Дальше
      </Button>
    </main>
  );
};
