import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
const mockToggle = vi.fn();

vi.mock('react-router', async () => {
  const actual = (await vi.importActual('react-router')) as object;
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/shared/lib/theme', () => ({
  useTheme: () => ({ toggle: mockToggle }),
}));

const { BackHeader } = await import('../BackHeader');

const renderBackHeader = (title = 'Настройки') =>
  render(
    <MemoryRouter>
      <BackHeader title={title} />
    </MemoryRouter>,
  );

describe('BackHeader', () => {
  it('рендерит кнопку "Назад" с корректным aria-label', () => {
    renderBackHeader();
    expect(screen.getByRole('button', { name: 'Назад' })).toBeInTheDocument();
  });

  it('кнопка "Назад" вызывает navigate(-1)', async () => {
    const user = userEvent.setup();
    renderBackHeader();
    await user.click(screen.getByRole('button', { name: 'Назад' }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('рендерит кнопку смены темы с корректным aria-label', () => {
    renderBackHeader();
    expect(screen.getByRole('button', { name: 'Сменить тему' })).toBeInTheDocument();
  });

  it('кнопка смены темы вызывает toggle', async () => {
    const user = userEvent.setup();
    renderBackHeader();
    await user.click(screen.getByRole('button', { name: 'Сменить тему' }));
    expect(mockToggle).toHaveBeenCalledOnce();
  });

  it('рендерит переданный title как heading', () => {
    renderBackHeader('История');
    expect(screen.getByRole('heading', { name: 'История' })).toBeInTheDocument();
  });
});
