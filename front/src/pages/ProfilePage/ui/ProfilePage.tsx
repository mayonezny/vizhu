import { Check, Pencil, User } from 'lucide-react';
import { useNavigate } from 'react-router';

import { authApi, useAuthStore } from '@/features/auth';
import { useToastStore } from '@/features/toast';
import { Button } from '@/shared/ui/Button';
import { RoundButton } from '@/shared/ui/RoundButton';

import './ProfilePage.scss';

const IPRA_FEATURES = [
  'AI и волонтёры без ограничений',
  'Специализированная помощь · 24/7',
  'Хранение истории — бессрочно',
];

export const ProfilePage = () => {
  const userName = useAuthStore((s) => s.userName);
  const logout = useAuthStore((s) => s.logout);
  const { showToast } = useToastStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      /* empty */
    }
    logout();
    void navigate('/auth');
  };

  return (
    <div className="profile-page">
      <div className="profile-page__header">
        <div className="profile-page__avatar" aria-hidden="true">
          <User size={40} />
        </div>
        <span className="profile-page__name">{userName ?? 'Пользователь'}</span>
        <RoundButton
          icon={<Pencil size={18} />}
          aria-label="Редактировать профиль (в разработке)"
          onClick={() => showToast('Функция в разработке')}
        />
      </div>

      <div className="profile-page__ipra" role="status" aria-label="Подписка по ИПРА активна">
        <div className="profile-page__ipra-tags">
          <span className="profile-page__ipra-tag">ПОДПИСКА</span>
          <span className="profile-page__ipra-tag">ПО ИПРА</span>
        </div>
        <p className="profile-page__ipra-title">ВИЖУ+</p>
        <p className="profile-page__ipra-date">Активна до 31.12.2027</p>
        <ul className="profile-page__ipra-features" aria-label="Возможности подписки">
          {IPRA_FEATURES.map((f) => (
            <li key={f} className="profile-page__ipra-feature">
              <Check size={16} aria-hidden="true" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      <p className="profile-page__copyright">
        {'© 2026 Команда проекта «Такой-то Бизнес». Все права защищены.\n\n'}
        {
          'Программный продукт «ВИЖУ» создан командой проекта и защищён авторским правом. Любое использование вне мероприятия «Я в деле» — по согласованию с правообладателями.\n\n'
        }
        {'Продукт находится в стадии разработки \n(Бета-версия)'}
      </p>

      <div className="profile-page__footer">
        <Button outline danger aria-label="Выйти из аккаунта" onClick={() => void handleLogout()}>
          Выйти
        </Button>
      </div>
    </div>
  );
};
