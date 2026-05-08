import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArrowRight } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '../index';

describe('Button', () => {
  // ── Базовый рендер ────────────────────────────────────────────────────────

  it('рендерится с текстом', () => {
    render(<Button>Дальше</Button>);
    expect(screen.getByRole('button', { name: 'Дальше' })).toBeInTheDocument();
  });

  it('по умолчанию type="button" — не триггерит сабмит формы', () => {
    render(<Button>Ок</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  // ── title / subtitle ──────────────────────────────────────────────────────

  it('рендерит title над лейблом', () => {
    render(<Button title="Шаг 1 из 3">Продолжить</Button>);
    expect(screen.getByText('Шаг 1 из 3')).toBeInTheDocument();
  });

  it('рендерит subtitle под лейблом', () => {
    render(<Button subtitle="Бесплатно">Продолжить</Button>);
    expect(screen.getByText('Бесплатно')).toBeInTheDocument();
  });

  it('не рендерит title/subtitle если не переданы', () => {
    render(<Button>Ок</Button>);
    expect(screen.queryByText('Шаг 1 из 3')).not.toBeInTheDocument();
  });

  // ── Варианты ──────────────────────────────────────────────────────────────

  it('базовая кнопка имеет класс btn', () => {
    render(<Button>Ок</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn');
  });

  it('primary добавляет класс btn--primary', () => {
    render(<Button primary>Начать</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn--primary');
  });

  it('outline добавляет класс btn--outline', () => {
    render(<Button outline>Пропустить</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn--outline');
  });

  it('danger добавляет класс btn--danger', () => {
    render(<Button danger>Удалить</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn--danger');
  });

  it('danger + outline — оба класса присутствуют', () => {
    render(
      <Button danger outline>
        Удалить
      </Button>,
    );
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('btn--danger');
    expect(btn).toHaveClass('btn--outline');
  });

  it('spread добавляет класс btn--spread', () => {
    render(
      <Button spread icon={<ArrowRight />}>
        1000 ₽
      </Button>,
    );
    expect(screen.getByRole('button')).toHaveClass('btn--spread');
  });

  it('прокидывает дополнительный className', () => {
    render(<Button className="extra">Ок</Button>);
    expect(screen.getByRole('button')).toHaveClass('extra');
  });

  // ── Иконка ────────────────────────────────────────────────────────────────

  it('иконка скрыта от скринридера через aria-hidden', () => {
    render(<Button icon={<span data-testid="ico" />}>Далее</Button>);
    const wrapper = screen.getByTestId('ico').parentElement;
    expect(wrapper).toHaveAttribute('aria-hidden', 'true');
  });

  it('iconPosition="right" — иконка после текста', () => {
    render(
      <Button icon={<span data-testid="ico" />} iconPosition="right">
        Далее
      </Button>,
    );
    const btn = screen.getByRole('button');
    const children = Array.from(btn.childNodes);
    const iconIdx = children.findIndex((n) =>
      (n as HTMLElement).querySelector?.('[data-testid="ico"]'),
    );
    const contentIdx = children.findIndex((n) =>
      (n as HTMLElement).classList?.contains('btn__content'),
    );
    expect(iconIdx).toBeGreaterThan(contentIdx);
  });

  it('iconPosition="left" — иконка перед текстом', () => {
    render(
      <Button icon={<span data-testid="ico" />} iconPosition="left">
        Скачать
      </Button>,
    );
    const btn = screen.getByRole('button');
    const children = Array.from(btn.childNodes);
    const iconIdx = children.findIndex((n) =>
      (n as HTMLElement).querySelector?.('[data-testid="ico"]'),
    );
    const contentIdx = children.findIndex((n) =>
      (n as HTMLElement).classList?.contains('btn__content'),
    );
    expect(iconIdx).toBeLessThan(contentIdx);
  });

  // ── Взаимодействие ────────────────────────────────────────────────────────

  it('вызывает onClick при клике', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Ок</Button>);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('disabled-кнопка не вызывает onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Недоступно
      </Button>,
    );
    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('disabled добавляет нативный атрибут disabled', () => {
    render(<Button disabled>Недоступно</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('активируется по Enter (keyboard)', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Ок</Button>);
    screen.getByRole('button').focus();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('активируется по Space (keyboard)', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Ок</Button>);
    screen.getByRole('button').focus();
    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledOnce();
  });
});
