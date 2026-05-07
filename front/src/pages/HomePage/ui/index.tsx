import { ArrowRight, Download, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/shared/ui/Button';

import './HomePage.scss';

export const HomePage = () => (
  <div className="home-page">
    <h1 className="home-page__title">Button showcase</h1>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      {/* Базовые */}
      <Button>Дальше</Button>
      <Button primary>Начать</Button>
      <Button outline>Пропустить</Button>

      {/* С title / subtitle */}
      <Button title="Шаг 1 из 3" subtitle="Бесплатно">
        Продолжить
      </Button>
      <Button primary title="Рекомендуем" subtitle="Доступно по ИПРА">
        Подключить Premium
      </Button>

      {/* С иконкой справа */}
      <Button icon={<ArrowRight />}>Далее</Button>
      <Button primary icon={<ArrowRight />}>
        Начать бесплатно
      </Button>

      {/* С иконкой слева */}
      <Button icon={<Download />} iconPosition="left">
        Скачать
      </Button>
      <Button outline icon={<Download />} iconPosition="left">
        Скачать
      </Button>

      {/* Danger */}
      <Button danger>Удалить аккаунт</Button>
      <Button danger outline icon={<Trash2 />} iconPosition="left">
        Удалить
      </Button>

      {/* Spread — контент слева, иконка справа */}
      <Button spread icon={<ArrowRight />}>
        1000 ₽
      </Button>
      <Button spread icon={<ArrowRight />} subtitle="Купюры • 09:42">
        1000 ₽
      </Button>

      {/* Disabled */}
      <Button disabled>Недоступно</Button>
      <Button outline disabled>
        Недоступно
      </Button>
    </div>

    <Link to="/demo" className="home-page__link home-page__link--primary" style={{ marginTop: 24 }}>
      Open Demo →
    </Link>
  </div>
);
