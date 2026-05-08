import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RoundButton } from '../index';

describe('RoundButton', () => {
  it('рендерится с aria-label', () => {
    render(<RoundButton icon={<span>X</span>} aria-label="Закрыть" />);
    expect(screen.getByRole('button', { name: 'Закрыть' })).toBeInTheDocument();
  });

  it('иконка скрыта от скринридера через aria-hidden', () => {
    render(<RoundButton icon={<span data-testid="icon">X</span>} aria-label="Закрыть" />);
    const iconWrapper = screen.getByTestId('icon').parentElement;
    expect(iconWrapper).toHaveAttribute('aria-hidden', 'true');
  });

  it('по умолчанию type="button" — не триггерит сабмит формы', () => {
    render(<RoundButton icon={<span />} aria-label="Кнопка" />);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('вызывает onClick при клике', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<RoundButton icon={<span />} aria-label="Кнопка" onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('disabled-кнопка не вызывает onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<RoundButton icon={<span />} aria-label="Кнопка" onClick={onClick} disabled />);
    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('применяет класс round-button по умолчанию', () => {
    render(<RoundButton icon={<span />} aria-label="Кнопка" />);
    expect(screen.getByRole('button')).toHaveClass('round-button');
  });

  it('применяет класс round-button--filled для variant="filled"', () => {
    render(<RoundButton icon={<span />} aria-label="Кнопка" variant="filled" />);
    expect(screen.getByRole('button')).toHaveClass('round-button--filled');
  });

  it('прокидывает дополнительный className', () => {
    render(<RoundButton icon={<span />} aria-label="Кнопка" className="extra" />);
    expect(screen.getByRole('button')).toHaveClass('extra');
  });

  it('поддерживает aria-labelledby вместо aria-label', () => {
    render(
      <>
        <span id="lbl">Действие</span>
        <RoundButton icon={<span />} aria-labelledby="lbl" />
      </>,
    );
    expect(screen.getByRole('button', { name: 'Действие' })).toBeInTheDocument();
  });
});
