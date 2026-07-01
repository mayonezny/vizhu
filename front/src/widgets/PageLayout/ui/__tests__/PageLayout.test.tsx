import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
const mockToggle = vi.fn();

vi.mock('react-router', async () => {
  const actual = (await vi.importActual('react-router')) as object;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useMatches: vi.fn(() => []),
    Outlet: () => <div data-testid="outlet" />,
  };
});

vi.mock('@/shared/lib/theme', () => ({
  useTheme: () => ({ toggle: mockToggle }),
}));

// Навигация читает роль через профиль (react-query + axios). В тесте роль не важна —
// достаточно «не волонтёр», чтобы не тянуть весь api-слой и env.
vi.mock('@/features/profile', () => ({
  useIsVolunteer: () => false,
}));

const { PageLayout } = await import('../index');
const { useMatches } = await import('react-router');

const renderLayout = () =>
  render(
    <MemoryRouter>
      <PageLayout />
    </MemoryRouter>,
  );

describe('PageLayout', () => {
  it('рендерит header с role="banner"', () => {
    renderLayout();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('рендерит main с id="main-content"', () => {
    renderLayout();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('main имеет tabIndex=-1 для skip-link фокуса', () => {
    renderLayout();
    expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1');
  });

  it('рендерит навигацию с aria-label', () => {
    renderLayout();
    expect(screen.getByRole('navigation', { name: 'Основная навигация' })).toBeInTheDocument();
  });

  it('навигация содержит 4 ссылки', () => {
    renderLayout();
    const nav = screen.getByRole('navigation', { name: 'Основная навигация' });
    expect(nav.querySelectorAll('a')).toHaveLength(4);
  });

  it('по умолчанию показывает LogoHeader', () => {
    vi.mocked(useMatches).mockReturnValue([]);
    renderLayout();
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('рендерит кнопку смены темы', () => {
    renderLayout();
    expect(screen.getByRole('button', { name: 'Переключить тему' })).toBeInTheDocument();
  });

  it('кнопка смены темы вызывает toggle', async () => {
    const user = userEvent.setup();
    renderLayout();
    await user.click(screen.getByRole('button', { name: 'Переключить тему' }));
    expect(mockToggle).toHaveBeenCalledOnce();
  });

  it('показывает BackHeader когда handle.headerVariant = "back"', () => {
    vi.mocked(useMatches).mockReturnValue([
      {
        id: '1',
        pathname: '/settings',
        params: {},
        data: undefined,
        loaderData: undefined,
        handle: { headerVariant: 'back', title: 'Настройки' },
      },
    ]);
    renderLayout();
    expect(screen.getByRole('button', { name: 'Назад' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Настройки' })).toBeInTheDocument();
  });

  it('рендерит Outlet внутри main', () => {
    renderLayout();
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });
});
