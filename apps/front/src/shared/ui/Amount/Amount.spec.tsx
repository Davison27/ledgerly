import { ThemeModeProvider } from '@/shared/lib/theme-mode/ThemeModeProvider';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Amount } from './Amount';

describe('Amount', () => {
  it('renders a localized euro amount', () => {
    render(
      <ThemeModeProvider>
        <Amount value={12345.5} currency="EUR" maximumFractionDigits={2} />
      </ThemeModeProvider>,
    );

    expect(screen.getByText(/12\.345,50\s*€/)).toBeInTheDocument();
  });

  it('uses the expense semantic color for negative auto amounts', () => {
    render(
      <ThemeModeProvider>
        <Amount value={-10} tone="auto" />
      </ThemeModeProvider>,
    );

    expect(screen.getByText(/-10\s*€/)).toHaveStyle({ color: 'rgb(193, 99, 63)' });
  });
});
