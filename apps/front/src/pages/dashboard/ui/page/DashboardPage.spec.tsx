import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useCompany } from '@/entities/company';
import { DashboardPage } from './DashboardPage';

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({ useNavigate: vi.fn() }));
vi.mock('@/entities/company', () => ({ useCompany: vi.fn() }));
vi.mock('../../api/dashboard.queries', () => ({ dashboardQueries: { company: vi.fn() } }));
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
vi.mock('../upcoming/UpcomingScheduleCard', () => ({ UpcomingScheduleCard: () => null }));
vi.mock('../tips/TipsPanel', () => ({ TipsPanel: () => null }));
vi.mock('../budget/BudgetVsActualCard', () => ({ BudgetVsActualCard: () => null }));
vi.mock('../vat/VatByQuarterCard', () => ({ VatByQuarterCard: () => null }));
vi.mock('../cashflow/CashflowForecastCard', () => ({ CashflowForecastCard: () => null }));
vi.mock('../kpi/KpiCard', () => ({ KpiCard: () => null }));

describe('DashboardPage', () => {
  const navigate = vi.fn();

  beforeEach(() => {
    vi.mocked(useNavigate).mockReturnValue(navigate as never);
    vi.mocked(useCompany).mockReturnValue({ company: { name: 'Acme' } } as never);
  });

  it('shows a loading skeleton while the dashboard query is pending', () => {
    vi.mocked(useQuery).mockReturnValue({ isPending: true, isError: false } as never);
    render(<DashboardPage />);
    expect(document.querySelectorAll('.ant-skeleton').length).toBeGreaterThan(0);
  });

  it('shows the loading error instead of empty dashboard actions', () => {
    vi.mocked(useQuery).mockReturnValue({ isPending: false, isError: true } as never);
    render(<DashboardPage />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se ha podido cargar el panel. Inténtalo de nuevo.',
    );
    expect(screen.queryByRole('button', { name: 'Crear proyecto' })).not.toBeInTheDocument();
  });

  it('takes an empty workspace to projects from the empty-state action', async () => {
    const user = userEvent.setup();
    vi.mocked(useQuery).mockReturnValue({
      isPending: false,
      isError: false,
      data: { projectCount: 0, totalDocuments: 0, year: 2026, availableYears: [2026] },
    } as never);
    render(<DashboardPage />);
    await user.click(screen.getByRole('button', { name: 'Crear proyecto' }));
    expect(navigate).toHaveBeenCalledWith({ to: '/projects' });
  });
});
