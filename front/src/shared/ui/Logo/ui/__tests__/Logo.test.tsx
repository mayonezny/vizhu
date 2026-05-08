import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { Logo } from '../index';

const renderLogo = (props = {}) =>
  render(
    <MemoryRouter>
      <Logo {...props} />
    </MemoryRouter>,
  );

describe('Logo', () => {
  it('рендерит SVG с role="img"', () => {
    renderLogo();
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('SVG имеет aria-label для скринридера', () => {
    renderLogo();
    expect(screen.getByRole('img')).toHaveAttribute('aria-label');
  });

  it('является ссылкой на главную страницу', () => {
    renderLogo();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/');
  });

  it('принимает дополнительный className', () => {
    renderLogo({ className: 'header-logo' });
    const link = screen.getByRole('link');
    expect(link).toHaveClass('logo', 'header-logo');
  });

  it('SVG имеет focusable="false" — не попадает в tab-порядок', () => {
    renderLogo();
    expect(screen.getByRole('img')).toHaveAttribute('focusable', 'false');
  });
});
