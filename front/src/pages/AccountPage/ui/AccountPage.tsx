import { Bell, Camera, Check, LogOut, MapPin, Mic } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { useAuthStore } from '@/features/auth';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';
import { Button } from '@/shared/ui/Button';

import './AccountPage.scss';

type PermKey = 'camera' | 'microphone' | 'geolocation' | 'notifications';
type PermState = 'granted' | 'denied' | 'prompt' | 'unsupported';

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

const STATUS_LABEL: Record<PermState, string> = {
  granted: 'Разрешено',
  denied: 'Запрещено',
  prompt: 'Не запрошено',
  unsupported: 'Недоступно',
};

/** Читает текущее состояние разрешения через Permissions API (где поддерживается). */
const readState = async (key: PermKey): Promise<PermState> => {
  try {
    if (key === 'notifications') {
      if (!('Notification' in window)) {
        return 'unsupported';
      }
      return Notification.permission === 'default' ? 'prompt' : Notification.permission;
    }

    if (!navigator.permissions?.query) {
      return 'prompt';
    }

    const name = key as PermissionName;
    const status = await navigator.permissions.query({ name });
    return status.state as PermState;
  } catch {
    // Часть браузеров не знает имя 'camera'/'microphone' — считаем, что можно запросить
    return 'prompt';
  }
};

/** Инициирует запрос разрешения у браузера. Тихо игнорирует отказ. */
const requestPermission = async (key: PermKey): Promise<void> => {
  try {
    if (key === 'camera' || key === 'microphone') {
      const stream = await navigator.mediaDevices.getUserMedia(
        key === 'camera' ? { video: true } : { audio: true },
      );
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    if (key === 'geolocation') {
      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(),
          () => resolve(),
        );
      });
      return;
    }

    if (key === 'notifications' && 'Notification' in window) {
      await Notification.requestPermission();
    }
  } catch {
    // отказ или недоступность — состояние перечитаем после
  }
};

export const AccountPage = () => {
  const navigate = useNavigate();
  const userName = useAuthStore((s) => s.userName);
  const logout = useAuthStore((s) => s.logout);

  const [states, setStates] = useState<Record<PermKey, PermState>>({
    camera: 'prompt',
    microphone: 'prompt',
    geolocation: 'prompt',
    notifications: 'prompt',
  });
  const [pending, setPending] = useState<PermKey | null>(null);

  const refresh = useCallback(async () => {
    const entries = await Promise.all(
      PERMISSIONS.map(async ({ key }) => [key, await readState(key)] as const),
    );
    setStates(Object.fromEntries(entries) as Record<PermKey, PermState>);
  }, []);

  useEffect(() => {
    announceRouteChange('Профиль. Управление разрешениями приложения.');
    void refresh();
  }, [refresh]);

  const handleRequest = async (key: PermKey) => {
    setPending(key);
    try {
      await requestPermission(key);
      await refresh();
    } finally {
      setPending(null);
    }
  };

  const handleLogout = () => {
    logout();
    void navigate('/auth', { replace: true });
  };

  return (
    <div className="account">
      {userName && (
        <div className="account__head">
          <p className="account__greeting">Здравствуйте,</p>
          <p className="account__name">{userName}</p>
        </div>
      )}

      <section className="account__section" aria-labelledby="account-perms-title">
        <h2 id="account-perms-title" className="account__section-title">
          Разрешения
        </h2>
        <p className="account__section-desc">
          Если функция не работает — проверьте разрешение и запросите его заново.
        </p>

        <ul className="account__list" aria-label="Список разрешений">
          {PERMISSIONS.map(({ key, icon, label, description }) => {
            const state = states[key];
            const isGranted = state === 'granted';
            const isDenied = state === 'denied';
            const isUnsupported = state === 'unsupported';

            return (
              <li key={key} className="account__item">
                <span className="account__item-icon" aria-hidden="true">
                  {icon}
                </span>

                <span className="account__item-content">
                  <span className="account__item-label">{label}</span>
                  <span className="account__item-desc">
                    {isDenied ? 'Заблокировано — включите в настройках браузера' : description}
                  </span>
                </span>

                {isGranted ? (
                  <span className="account__status account__status--granted">
                    <Check size={18} aria-hidden="true" />
                    {STATUS_LABEL.granted}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="account__request"
                    disabled={isUnsupported || pending === key}
                    aria-label={`${label}: ${STATUS_LABEL[state]}. Запросить разрешение`}
                    onClick={() => void handleRequest(key)}
                  >
                    {pending === key ? 'Запрос…' : isDenied ? 'Повторить' : 'Запросить'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <Button
        className="btn--demo"
        icon={<LogOut size={24} />}
        iconPosition="left"
        onClick={handleLogout}
        aria-label="Выйти из аккаунта"
      >
        Выйти
      </Button>
    </div>
  );
};
