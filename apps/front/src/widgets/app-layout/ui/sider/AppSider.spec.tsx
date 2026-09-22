import type { ComponentPropsWithoutRef } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppSider } from './AppSider';

const siderMocks = vi.hoisted(() => ({ pathname: '/dashboard' }));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: ComponentPropsWithoutRef<'a'> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useRouterState: ({ select }: { select: (state: { location: { pathname: string } }) => unknown }) =>
    select({ location: { pathname: siderMocks.pathname } }),
}));

vi.mock('@/entities/company', () => ({
  useCompany: () => ({ company: { name: 'Ledgerly workspace', logo: null } }),
}));

vi.mock('@/entities/workspace-member', () => ({
  memberInitials: () => 'LC',
  useWorkspaceAccess: () => ({ member: { id: 'member-1', name: 'Laura Costa' } }),
  workspaceMemberAvatarUrl: () => undefined,
}));

vi.mock('../../model/useSettingsMenuItems', () => ({ useSettingsMenuItems: () => [] }));

describe('AppSider release link', () => {
  beforeEach(() => {
    siderMocks.pathname = '/dashboard';
  });

  it('shows the current Ledgerly version in the expanded sidebar', () => {
    render(<AppSider collapsed={false} onCollapse={vi.fn()} />);

    const link = screen.getByRole('link', {
      name: 'Abrir el registro de cambios de Ledgerly versión 1.1.0',
    });
    expect(link).toHaveAttribute('href', '/changelog');
    expect(link).toHaveTextContent('Ledgerly v1.1.0');
  });

  it('keeps the collapsed version control accessible by name', () => {
    render(<AppSider collapsed onCollapse={vi.fn()} />);

    const link = screen.getByRole('link', {
      name: 'Abrir el registro de cambios de Ledgerly versión 1.1.0',
    });
    expect(link).toHaveAttribute('href', '/changelog');
    expect(link).not.toHaveTextContent('Ledgerly v1.1.0');
  });
});
