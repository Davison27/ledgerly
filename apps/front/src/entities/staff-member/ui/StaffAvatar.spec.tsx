import { ThemeModeProvider } from '@/shared/lib/theme-mode/ThemeModeProvider';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StaffAvatar } from './StaffAvatar';

describe('StaffAvatar', () => {
  it('renders initials from the staff member name', () => {
    render(
      <ThemeModeProvider>
        <StaffAvatar staffMember={{ id: 'staff-1', firstName: 'Laura', lastName: 'Costa' }} />
      </ThemeModeProvider>,
    );

    expect(screen.getByText('LC')).toBeInTheDocument();
  });

  it('keeps a deterministic color for the same staff member', () => {
    const { rerender } = render(
      <ThemeModeProvider>
        <StaffAvatar staffMember={{ id: 'staff-1', firstName: 'Laura', lastName: 'Costa' }} />
      </ThemeModeProvider>,
    );
    const firstColor = screen.getByText('LC').parentElement?.getAttribute('style');

    rerender(
      <ThemeModeProvider>
        <StaffAvatar staffMember={{ id: 'staff-1', firstName: 'Laura', lastName: 'Costa' }} />
      </ThemeModeProvider>,
    );

    expect(screen.getByText('LC').parentElement?.getAttribute('style')).toBe(firstColor);
  });
});
