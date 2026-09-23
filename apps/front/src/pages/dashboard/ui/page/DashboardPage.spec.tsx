import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { companyQueries } from '@/entities/company';
import type { CompanyDashboardDto } from '../../api/types';
import { DashboardPage } from './DashboardPage';

const accessMocks = vi.hoisted(() => ({
  grants: {} as Record<string, string>,
}));

vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useQuery: vi.fn(),
}));
vi.mock('@tanstack/react-router', () => ({ useNavigate: vi.fn() }));
vi.mock('@/entities/workspace-member', () => ({
  useWorkspaceAccess: () => ({
    canAccess: (module: string, level: string) => {
      const rank: Record<string, number> = { none: 0, view: 1, edit: 2 };
      return rank[accessMocks.grants[module] ?? 'none'] >= rank[level];
    },
  }),
}));
vi.mock('@/shared/ui/PageContainer', () => ({ PageContainer: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock('@/shared/ui/PageHeader', () => ({ PageHeader: ({ title, subtitle, actions }: { title: React.ReactNode; subtitle: React.ReactNode; actions?: React.ReactNode }) => <header><h1>{title}</h1><p>{subtitle}</p>{actions}</header> }));
vi.mock('@/shared/ui/Amount', () => ({ Amount: () => null }));
vi.mock('@/shared/ui/Numeric', () => ({ Numeric: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/widgets/dashboard-charts', () => ({
  MonthlyChart: () => null, MonthlyProfitChart: () => null, CumulativeProfitChart: () => null,
  MarginTrendChart: () => null, CategoryDonut: () => null, StatusBreakdown: () => null,
  CashflowByStatus: () => null, TopIssuers: () => null, formatPct: (value: number) => `${value}%`,
}));
vi.mock('../topProjects/TopProjectsCard', () => ({ TopProjectsCard: () => null }));
vi.mock('../tips/TipsPanel', () => ({ TipsPanel: () => null }));
vi.mock('../budget/BudgetVsActualCard', () => ({ BudgetVsActualCard: () => null }));
vi.mock('../vat/VatByQuarterCard', () => ({ VatByQuarterCard: () => null }));
vi.mock('../cashflow/CashflowForecastCard', () => ({ CashflowForecastCard: () => null }));
vi.mock('../kpi/KpiCard', () => ({ KpiCard: () => null }));

function dashboard(overrides: Partial<CompanyDashboardDto> = {}): CompanyDashboardDto {
  return {
    year: 2026,
    availableYears: [2026],
    projectCount: 1,
    totalDocuments: 10,
    income: 1000,
    expenses: 500,
    profit: 500,
    margin: 0.5,
    paidCount: 10,
    pendingCount: 0,
    overdueCount: 0,
    amountByStatus: { paid: 1000, pending: 0, overdue: 0 },
    monthlyIncome: [],
    monthlyExpenses: [],
    monthlyProfit: [],
    cumulativeProfit: [],
    monthlyMargin: [],
    categoryTotals: { invoice: 10, payroll: 0, tax: 0 },
    topIssuers: [],
    topProjects: [],
    previousYear: { year: 2025, income: 0, expenses: 0, profit: 0, margin: 0, totalDocuments: 0 },
    budgetVsActual: [],
    vatByQuarter: [],
    cashflowForecast: { overdue: { inflow: 0, outflow: 0, net: 0 }, months: [] },
    ...overrides,
  };
}

describe('DashboardPage', () => {
  const navigate = vi.fn();
  let dashboardResult: {
    data?: CompanyDashboardDto;
    isPending: boolean;
    isError: boolean;
  };

  beforeEach(() => {
    vi.mocked(useNavigate).mockReturnValue(navigate as never);
    navigate.mockClear();
    accessMocks.grants = {
      dashboard: 'view',
      projects: 'edit',
      calendar: 'edit',
      documents: 'view',
      suppliers: 'view',
      equipment: 'view',
      staff: 'view',
    };
    dashboardResult = { data: dashboard(), isPending: false, isError: false };
    vi.mocked(useQuery).mockImplementation((options) => {
      const queryKey = (options as { queryKey?: unknown[] }).queryKey;
      if (queryKey?.[0] === 'dashboard') return dashboardResult as never;
      if (queryKey?.[0] === 'company') {
        return { data: { name: 'Acme' }, isPending: false, isError: false } as never;
      }
      if (queryKey?.[0] === 'schedule') {
        return { data: [], isPending: false, isError: false } as never;
      }
      return { isPending: false, isError: false } as never;
    });
  });

  it('shows a loading skeleton while the dashboard query is pending', () => {
    dashboardResult = { isPending: true, isError: false };
    render(<DashboardPage />);
    expect(document.querySelectorAll('.ant-skeleton').length).toBeGreaterThan(0);
  });

  it('shows the loading error instead of empty dashboard actions', () => {
    dashboardResult = { isPending: false, isError: true };
    render(<DashboardPage />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se ha podido cargar el panel. Inténtalo de nuevo.',
    );
    expect(screen.queryByRole('button', { name: 'Gestionar empresas' })).not.toBeInTheDocument();
  });

  it('takes an empty workspace to companies from the empty-state action when Projects is visible', async () => {
    const user = userEvent.setup();
    dashboardResult = {
      data: dashboard({ projectCount: 0, totalDocuments: 0 }),
      isPending: false,
      isError: false,
    };
    render(<DashboardPage />);
    await user.click(screen.getByRole('button', { name: 'Gestionar empresas' }));
    expect(navigate).toHaveBeenCalledWith({ to: '/companies' });
  });

  it('hides the empty-state Companies action when Projects is not visible', () => {
    accessMocks.grants.projects = 'none';
    dashboardResult = {
      data: dashboard({ projectCount: 0, totalDocuments: 0 }),
      isPending: false,
      isError: false,
    };

    render(<DashboardPage />);

    expect(screen.queryByRole('button', { name: 'Gestionar empresas' })).not.toBeInTheDocument();
  });

  it.each([
    ['Calendar', 'none', 'view'],
    ['Projects', 'view', 'none'],
  ])('hides upcoming schedule and skips its query without %s view', (_section, calendar, projects) => {
    accessMocks.grants.calendar = calendar;
    accessMocks.grants.projects = projects;

    render(<DashboardPage />);

    expect(screen.queryByRole('heading', { name: 'Próximos eventos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver todos' })).not.toBeInTheDocument();
    expect(
      vi.mocked(useQuery).mock.calls.some(([options]) => {
        const queryKey = (options as { queryKey?: unknown[] }).queryKey;
        return queryKey?.[0] === 'schedule';
      }),
    ).toBe(false);
  });

  it('uses public branding instead of the admin-only company profile for the greeting', () => {
    accessMocks.grants.projects = 'none';
    accessMocks.grants.calendar = 'none';

    render(<DashboardPage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Acme');
    expect(
      vi.mocked(useQuery).mock.calls.some(([options]) => {
        const queryKey = (options as { queryKey?: unknown[] }).queryKey;
        return queryKey?.[0] === 'company' && queryKey.length === 1;
      }),
    ).toBe(false);
    expect(vi.mocked(useQuery).mock.calls).toEqual(
      expect.arrayContaining([
        [expect.objectContaining({ queryKey: companyQueries.branding().queryKey })],
      ]),
    );
  });
});
