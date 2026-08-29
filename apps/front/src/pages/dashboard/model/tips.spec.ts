import { describe, expect, it } from 'vitest';
import type { CompanyDashboardDto } from '../api/types';
import { deriveTips } from './tips';

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
    amountByStatus: { pagado: 1000, pendiente: 0, vencido: 0 },
    monthlyIncome: [],
    monthlyExpenses: [],
    monthlyProfit: [],
    cumulativeProfit: [],
    monthlyMargin: [],
    categoryTotals: { factura: 10, nomina: 0, impuesto: 0 },
    topIssuers: [],
    topProjects: [],
    previousYear: { year: 2025, income: 0, expenses: 0, profit: 0, margin: 0, totalDocuments: 0 },
    budgetVsActual: [],
    vatByQuarter: [],
    cashflowForecast: { overdue: { inflow: 0, outflow: 0, net: 0 }, months: [] },
    ...overrides,
  };
}

describe('deriveTips', () => {
  it('returns the healthy tip for profitable activity without overdue documents', () => {
    expect(deriveTips(dashboard()).map((tip) => tip.id)).toEqual(['healthy']);
  });

  it('orders warnings before informational and success tips', () => {
    const tips = deriveTips(
      dashboard({
        overdueCount: 1,
        pendingCount: 5,
        expenses: 1200,
        income: 1000,
        margin: 0.05,
      }),
    );

    expect(tips.map((tip) => tip.id)).toEqual([
      'overdue',
      'manyPending',
      'expensesOverIncome',
      'lowMargin',
    ]);
  });

  it('uses the no-projects tip and does not add the no-documents tip in the same branch', () => {
    expect(
      deriveTips(
        dashboard({
          projectCount: 0,
          totalDocuments: 0,
          income: 0,
          expenses: 0,
          profit: 0,
          margin: 0,
        }),
      ).map((tip) => tip.id),
    ).toEqual(['noProjects']);
  });
});
