import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';

import { useRegistrationStore } from '@/features/registration';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { RoundButton } from '@/shared/ui/RoundButton';

import './RegistrationNamePage.scss';

const schema = z.object({
  name: z.string().min(1, 'Введите имя'),
  age: z
    .string()
    .min(1, 'Введите возраст')
    .refine((v) => {
      const n = parseInt(v, 10);
      return !isNaN(n) && n >= 1 && n <= 120;
    }, 'Введите корректный возраст (1–120)'),
});

type FormValues = z.infer<typeof schema>;

export const RegistrationNamePage = () => {
  const navigate = useNavigate();
  const { name, age, setName, setAge } = useRegistrationStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name, age },
  });

  useEffect(() => {
    announceRouteChange('Шаг 1 из 4. Как к вам обращаться?');
  }, []);

  const onSubmit = (data: FormValues) => {
    setName(data.name);
    setAge(data.age);
    void navigate('/registration/vision');
  };

  return (
    <main id="main-content" className="reg-name" tabIndex={-1} aria-labelledby="reg-name-title">
      <div className="reg-name__back">
        <RoundButton
          aria-label="Назад"
          icon={<ChevronLeft size={24} />}
          onClick={() => void navigate(-1)}
        />
      </div>

      <div className="reg-name__head">
        <h1 id="reg-name-title" className="reg-name__title">
          Как к вам обращаться?
        </h1>
        <p className="reg-name__desc">
          Имя нужно волонтёру и ИИ-помощнику, чтобы говорить лично с вами.
        </p>
      </div>

      <form
        className="reg-name__form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        aria-label="Форма ввода имени и возраста"
      >
        <Input
          {...register('name')}
          label="Имя"
          type="text"
          autoComplete="given-name"
          autoFocus
          placeholder="Светлана"
          hint="Можно использовать псевдоним."
          error={errors.name?.message}
          aria-label="Ваше имя"
        />

        <Input
          {...register('age')}
          label="Возраст"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          placeholder="63"
          hint="Помогает подобрать темп речи и подсказки."
          error={errors.age?.message}
          aria-label="Ваш возраст"
        />

        <Button type="submit" aria-label="Перейти к следующему шагу">
          Дальше
        </Button>
      </form>
    </main>
  );
};
