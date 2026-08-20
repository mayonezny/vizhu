import { Bell, Camera, ChevronLeft, MapPin, Mic } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { registrationApi, useRegistrationStore } from '@/features/registration';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';
import { platform } from '@/shared/platform';
import type { PermissionKind as PermKey } from '@/shared/platform';
import { Button } from '@/shared/ui/Button';
import { RoundButton } from '@/shared/ui/RoundButton';

import './RegistrationPermissionsPage.scss';

type Permission = {
  key: PermKey;
  icon: React.ReactNode;
  label: string;
  description: string;
};

const PERMISSIONS: Permission[] = [
  {
    key: 'camera',
    icon: <Camera size={24} />,
    label: 'Камера',
    description: 'Описание сцены, OCR, купюры',
  },
  {
    key: 'microphone',
    icon: <Mic size={24} />,
    label: 'Микрофон',
    description: 'Голосовые команды и звонки',
  },
  {
    key: 'geolocation',
    icon: <MapPin size={24} />,
    label: 'Геолокация',
    description: 'SOS-кнопка и волонтёр рядом',
  },
  {
    key: 'notifications',
    icon: <Bell size={24} />,
    label: 'Уведомления',
    description: 'Когда волонтёр ответил',
  },
];

const requestPermissions = async (perms: Record<PermKey, boolean>) => {
  const kinds = (Object.keys(perms) as PermKey[]).filter((key) => perms[key]);
  await platform.permissions.requestMany(kinds);
};

export const RegistrationPermissionsPage = () => {
  const navigate = useNavigate();
  const { name, age, blindnessTypeId, reset } = useRegistrationStore();
  const [enabled, setEnabled] = useState<Record<PermKey, boolean>>({
    camera: true,
    microphone: true,
    geolocation: true,
    notifications: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    announceRouteChange('Шаг 4 из 4. Разрешения для работы приложения.');
  }, []);

  const toggle = (key: PermKey) => {
    setEnabled((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDone = async () => {
    setIsLoading(true);
    try {
      await requestPermissions(enabled);
      const parsedAge = age ? parseInt(age, 10) : undefined;
      await registrationApi.createProfile({
        name,
        ...(parsedAge !== undefined && !isNaN(parsedAge) && { age: parsedAge }),
        ...(blindnessTypeId !== null && { blindnessTypeId }),
      });
      reset();
      void navigate('/registration/welcome', { replace: true });
    } catch {
      void navigate('/registration/welcome', { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main id="main-content" className="reg-perms" tabIndex={-1} aria-labelledby="reg-perms-title">
      <div className="reg-perms__back">
        <RoundButton
          aria-label="Назад"
          icon={<ChevronLeft size={24} />}
          onClick={() => void navigate('/registration/ipra')}
        />
      </div>

      <div className="reg-perms__head">
        <h1 id="reg-perms-title" className="reg-perms__title">
          Несколько разрешений
        </h1>
        <p className="reg-perms__desc">Нужны для работы основных функций. Можно отключить позже.</p>
      </div>

      <ul className="reg-perms__list" aria-label="Список разрешений">
        {PERMISSIONS.map(({ key, icon, label, description }) => {
          const id = `perm-${key}`;
          return (
            <li key={key} className="reg-perms__item">
              <span className="reg-perms__item-icon" aria-hidden="true">
                {icon}
              </span>
              <label htmlFor={id} className="reg-perms__item-content">
                <span className="reg-perms__item-label">{label}</span>
                <span className="reg-perms__item-desc">{description}</span>
              </label>
              <button
                id={id}
                type="button"
                role="switch"
                aria-checked={enabled[key]}
                aria-label={`${label}: ${enabled[key] ? 'включено' : 'выключено'}`}
                className={['reg-perms__toggle', enabled[key] && 'reg-perms__toggle--on']
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => toggle(key)}
              >
                <span className="reg-perms__toggle-thumb" />
              </button>
            </li>
          );
        })}
      </ul>

      <Button onClick={handleDone} disabled={isLoading} aria-label="Завершить регистрацию">
        {isLoading ? 'Завершаем...' : 'Готово'}
      </Button>
    </main>
  );
};
