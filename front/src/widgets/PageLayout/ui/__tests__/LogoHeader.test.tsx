import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

const mockToggle = vi.fn();

vi.mock('@/shared/lib/theme', () => ({
  useTheme: () => ({ toggle: mockToggle }),
}));

const { LogoHeader } = await import('../LogoHeader');

const renderLogoHeader = () =>
  render(
    <MemoryRouter>
      <LogoHeader />
    </MemoryRouter>,
  );

describe('LogoHeader', () => {
  it('рендерит логотип', () => {
    renderLogoHeader();
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('логотип — ссылка на главную', () => {
    renderLogoHeader();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/');
  });

  it('рендерит кнопку смены темы', () => {
    renderLogoHeader();
    expect(screen.getByRole('button', { name: 'Кнопка смены темы' })).toBeInTheDocument();
  });

  it('кнопка смены темы вызывает toggle', async () => {
    const user = userEvent.setup();
    renderLogoHeader();
    await user.click(screen.getByRole('button', { name: 'Кнопка смены темы' }));
    expect(mockToggle).toHaveBeenCalledOnce();
  });
});
