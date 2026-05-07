import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

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
});
