import type { ComponentPropsWithoutRef } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { currentReleaseVersion } from '@/entities/release-note';
import { AppSider } from './AppSider';

const siderMocks = vi.hoisted(() => ({
  pathname: '/dashboard',
  role: 'member',
  modules: ['dashboard', 'projects', 'calendar', 'documents', 'suppliers', 'equipment', 'staff', 'planning'],
}));

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

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: { name: 'Ledgerly workspace', logo: null, brandColor: null } }),
}));

vi.mock('@/entities/company', () => ({
  companyQueries: { branding: () => ({ queryKey: ['company', 'branding'] }) },
}));

vi.mock('@/entities/workspace-member', () => ({
  hasModuleAccess: (role: string, _permissions: unknown, module: string) =>
    role === 'admin' || siderMocks.modules.includes(module),
  memberInitials: () => 'LC',
  useWorkspaceAccess: () => ({
    member: {
      id: 'member-1',
      name: 'Laura Costa',
      role: siderMocks.role,
      permissions: {},
    },
  }),
  workspaceMemberAvatarUrl: () => undefined,
}));

vi.mock('../../model/useSettingsMenuItems', () => ({ useSettingsMenuItems: () => [] }));

describe('AppSider release link', () => {
  beforeEach(() => {
    siderMocks.pathname = '/dashboard';
    siderMocks.role = 'member';
    siderMocks.modules = ['dashboard', 'projects', 'calendar', 'documents', 'suppliers', 'equipment', 'staff', 'planning'];
  });

  it('shows the current Ledgerly version in the expanded sidebar', () => {
    render(<AppSider collapsed={false} onCollapse={vi.fn()} />);

    const link = screen.getByRole('link', {
      name: `Abrir el registro de cambios de Ledgerly versión ${currentReleaseVersion}`,
    });
    expect(link).toHaveAttribute('href', '/changelog');
    expect(link).toHaveTextContent(`Ledgerly v${currentReleaseVersion}`);
  });

  it('keeps the collapsed version control accessible by name', () => {
    render(<AppSider collapsed onCollapse={vi.fn()} />);

    const link = screen.getByRole('link', {
      name: `Abrir el registro de cambios de Ledgerly versión ${currentReleaseVersion}`,
    });
    expect(link).toHaveAttribute('href', '/changelog');
    expect(link).not.toHaveTextContent(`Ledgerly v${currentReleaseVersion}`);
  });

  it('hides sections the member cannot view', () => {
    siderMocks.modules = ['documents', 'staff'];

    render(<AppSider collapsed={false} onCollapse={vi.fn()} />);

    expect(screen.getByText('Documentos')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.queryByText('Panel')).not.toBeInTheDocument();
    expect(screen.queryByText('Empresas')).not.toBeInTheDocument();
  });

  it('keeps every section visible for administrators', () => {
    siderMocks.role = 'admin';
    siderMocks.modules = [];

    render(<AppSider collapsed={false} onCollapse={vi.fn()} />);

    expect(screen.getByText('Panel')).toBeInTheDocument();
    expect(screen.getByText('Empresas')).toBeInTheDocument();
    expect(screen.getByText('Calendario')).toBeInTheDocument();
  });

  it('shows Planning only when the member has planning view access', () => {
    siderMocks.modules = ['planning'];

    render(<AppSider collapsed={false} onCollapse={vi.fn()} />);

    expect(screen.getByText('Planificación')).toBeInTheDocument();
    expect(screen.queryByText('Empresas')).not.toBeInTheDocument();
  });
});
