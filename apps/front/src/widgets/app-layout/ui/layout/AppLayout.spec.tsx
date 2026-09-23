import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppLayout } from './AppLayout';

const layoutMocks = vi.hoisted(() => ({
  isAdmin: false,
  isPending: false,
  singleton: { isSuccess: true, isPending: false, data: { id: 'company-1', name: 'Example' } },
  branding: {
    isSuccess: true,
    isPending: false,
    isError: false,
    data: { name: 'Example', logo: null, brandColor: null },
  },
  queryOptions: [] as Array<{ queryKey: readonly string[]; enabled?: boolean }>,
  navigate: vi.fn(),
  pathname: '/dashboard',
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: { queryKey: readonly string[]; enabled?: boolean }) => {
    layoutMocks.queryOptions.push(options);
    return options.queryKey[1] === 'branding' ? layoutMocks.branding : layoutMocks.singleton;
  },
}));

vi.mock('@tanstack/react-router', () => ({
  Outlet: () => <div data-testid="outlet">Protected page</div>,
  useNavigate: () => layoutMocks.navigate,
  useRouterState: ({ select }: { select: (state: { location: { pathname: string } }) => unknown }) =>
    select({ location: { pathname: layoutMocks.pathname } }),
}));

vi.mock('@/entities/company', () => ({
  companyNeedsSetup: (company: { id: string }) => !company.id,
  companyQueries: {
    singleton: () => ({ queryKey: ['company'] }),
    branding: () => ({ queryKey: ['company', 'branding'] }),
  },
}));

vi.mock('@/entities/workspace-member', () => ({
  useWorkspaceAccess: () => ({ isAdmin: layoutMocks.isAdmin, isPending: layoutMocks.isPending }),
}));

vi.mock('../../model/useSyncBrandColor', () => ({ useSyncBrandColor: vi.fn() }));
vi.mock('../sider/AppSider', () => ({ AppSider: () => <aside /> }));
vi.mock('../topBar/TopBar', () => ({
  TopBar: () => <header><button data-testid="notification-center" /></header>,
}));
vi.mock('@/features/release-notice', () => ({
  ReleaseNoticeDialog: () => <div data-testid="release-notice" />,
}));

describe('AppLayout company access', () => {
  beforeEach(() => {
    layoutMocks.isAdmin = false;
    layoutMocks.isPending = false;
    layoutMocks.singleton = {
      isSuccess: true,
      isPending: false,
      data: { id: 'company-1', name: 'Example' },
    };
    layoutMocks.branding = {
      isSuccess: true,
      isPending: false,
      isError: false,
      data: { name: 'Example', logo: null, brandColor: null },
    };
    layoutMocks.navigate.mockReset();
    layoutMocks.queryOptions = [];
    layoutMocks.pathname = '/dashboard';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows the waiting state to members when public branding has no configured company', () => {
    layoutMocks.branding = {
      isSuccess: true,
      isPending: false,
      isError: false,
      data: { name: '', logo: null, brandColor: null },
    };

    render(<AppLayout />);

    expect(screen.getByText('Se está configurando tu espacio de trabajo')).toBeInTheDocument();
    expect(screen.queryByTestId('outlet')).not.toBeInTheDocument();
    expect(screen.getByTestId('notification-center')).toBeInTheDocument();
    expect(screen.getByTestId('release-notice')).toBeInTheDocument();
    expect(layoutMocks.navigate).not.toHaveBeenCalled();
    expect(layoutMocks.queryOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ queryKey: ['company'], enabled: false }),
        expect.objectContaining({ queryKey: ['company', 'branding'], enabled: true }),
      ]),
    );
  });

  it('keeps onboarding available to administrators when the company is missing', async () => {
    layoutMocks.isAdmin = true;
    layoutMocks.singleton = {
      isSuccess: true,
      isPending: false,
      data: { id: '', name: '' },
    };

    render(<AppLayout />);

    await waitFor(() => expect(layoutMocks.navigate).toHaveBeenCalledWith({ to: '/onboarding' }));
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
    expect(screen.queryByTestId('release-notice')).not.toBeInTheDocument();
  });

  it('keeps the changelog and notifications shell available while members wait', () => {
    layoutMocks.pathname = '/changelog';
    layoutMocks.branding = {
      isSuccess: true,
      isPending: false,
      isError: false,
      data: { name: '', logo: null, brandColor: null },
    };

    render(<AppLayout />);

    expect(screen.getByTestId('outlet')).toBeInTheDocument();
    expect(screen.getByTestId('release-notice')).toBeInTheDocument();
  });
});
