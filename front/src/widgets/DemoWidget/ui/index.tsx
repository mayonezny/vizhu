import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useCreatePost, usePosts } from '@/entities/post';
import { useCounterStore } from '@/features/counter';
import { Button } from '@/shared/ui/Button';

import './demo-widget.scss';

const schema = z.object({
  title: z.string().min(1, 'Введите заголовок'),
  body: z.string().min(1, 'Введите текст'),
});

type FormValues = z.infer<typeof schema>;

export const DemoWidget = () => {
  const { count, increment, decrement, reset } = useCounterStore();
  const { data: posts, isLoading, isError } = usePosts();
  const { mutate: createPost, isPending } = useCreatePost();

  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (values: FormValues) => {
    createPost({ ...values, userId: 1 }, { onSuccess: () => resetForm() });
  };

  return (
    <div className="demo-widget">
      <section className="demo-widget__section">
        <h2>Zustand — счётчик</h2>
        <p className="demo-widget__count">{count}</p>
        <div className="demo-widget__row">
          <Button onClick={decrement}>−</Button>
          <Button onClick={increment}>+</Button>
          <Button onClick={reset}>Сброс</Button>
        </div>
      </section>

      <section className="demo-widget__section">
        <h2>TanStack Query — посты</h2>
        {isLoading && <p>Загрузка...</p>}
        {isError && <p role="alert">Ошибка загрузки</p>}
        <ul>
          {posts?.map((p) => (
            <li key={p.id}>{p.title}</li>
          ))}
        </ul>
      </section>

      <section className="demo-widget__section">
        <h2>React Hook Form + Zod — новый пост</h2>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <input {...register('title')} placeholder="Заголовок" />
            {errors.title && <p role="alert">{errors.title.message}</p>}
          </div>
          <div>
            <textarea {...register('body')} placeholder="Текст" />
            {errors.body && <p role="alert">{errors.body.message}</p>}
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Отправка...' : 'Создать'}
          </Button>
        </form>
      </section>
    </div>
  );
};
