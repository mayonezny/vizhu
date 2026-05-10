import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { ChevronLeft } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';

import { authApi, useAuthStore } from '@/features/auth';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { RoundButton } from '@/shared/ui/RoundButton';

import './PhoneAuthPage.scss';

const phoneSchema = z.object({
  phone: z
    .string()
    .min(1, 'Введите номер телефона')
    .refine((v) => {
      const digits = v.replace(/\D/g, '');
      return digits.length === 10 || digits.length === 11;
    }, 'Введите корректный номер — 10 или 11 цифр, например 912 345-67-89'),
});

type FormValues = z.infer<typeof phoneSchema>;

export const PhoneAuthPage = () => {
  const navigate = useNavigate();
  const setPhone = useAuthStore((s) => s.setPhone);
  const storedPhone = useAuthStore((s) => s.phone);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: storedPhone ?? '' },
  });

  useEffect(() => {
    announceRouteChange('Ввод номера телефона');
  }, []);

  const onSubmit = async (data: FormValues) => {
    const digits = data.phone.replace(/\D/g, '');
    const normalized = digits.length === 10 ? `+7${digits}` : `+${digits}`;

    try {
      await authApi.requestCode(normalized);
      setPhone(normalized);
      void navigate('/auth/code');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        setError('phone', { message: 'Слишком много запросов. Подождите немного.' });
      } else {
        setError('phone', { message: 'Не удалось отправить SMS. Попробуйте позже.' });
      }
    }
  };

  return (
    <main id="main-content" className="phone-auth" tabIndex={-1} aria-labelledby="phone-auth-title">
      <div className="phone-auth__back">
        <RoundButton
          aria-label="Назад"
          icon={<ChevronLeft size={24} />}
          onClick={() => void navigate('/auth')}
        />
      </div>

      <div className="phone-auth__head">
        <h1 id="phone-auth-title" className="phone-auth__title">
          Ваш номер телефона
        </h1>
        <p className="phone-auth__desc">Отправим SMS с кодом подтверждения.</p>
      </div>

      <form
        className="phone-auth__form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        aria-label="Форма ввода номера телефона"
      >
        <Input
          {...register('phone')}
          label="ТЕЛЕФОН"
          type="tel"
          inputMode="numeric"
          placeholder="+7 900 000-00-00"
          autoComplete="tel"
          autoFocus
          error={errors.phone?.message}
          aria-label="Номер телефона"
        />

        <p className="phone-auth__hint" aria-hidden="true">
          SMS бесплатно · придёт за ~30 секунд
        </p>

        <Button type="submit" disabled={isSubmitting} aria-label="Получить код подтверждения">
          {isSubmitting ? 'Отправляем...' : 'Получить код'}
        </Button>
      </form>
    </main>
  );
};
