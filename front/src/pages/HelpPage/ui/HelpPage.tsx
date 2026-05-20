import { useAuthStore } from '@/features/auth';
import { useToastStore } from '@/features/toast';
import { Button } from '@/shared/ui/Button';

import './HelpPage.scss';

export const HelpPage = () => {
  const favoriteContactName = useAuthStore((s) => s.favoriteContactName);
  const favoriteContactPhone = useAuthStore((s) => s.favoriteContactPhone);
  const { showToast } = useToastStore();

  const handleFavoriteContact = () => {
    if (favoriteContactPhone) {
      window.location.href = `tel:${favoriteContactPhone}`;
    } else {
      showToast('Избранный контакт не задан');
    }
  };

  return (
    <div className="help-page">
      <Button
        primary
        spread
        subtitle="Избранный контакт"
        aria-label={`Позвонить ${favoriteContactName ?? 'избранному контакту'}`}
        onClick={handleFavoriteContact}
      >
        {favoriteContactName ?? 'Избранный контакт'}
      </Button>

      <Button
        primary
        spread
        subtitle="112 • 103 • 101"
        aria-label="Позвонить в экстренные службы, номер 112"
        onClick={() => {
          window.location.href = 'tel:112';
        }}
      >
        Экстренные службы
      </Button>

      <Button
        primary
        spread
        subtitle="Приоритетная очередь ≈ 12 сек"
        aria-label="Вызвать волонтёра"
        onClick={() => showToast('Функция в разработке')}
      >
        Волонтёр
      </Button>
    </div>
  );
};
