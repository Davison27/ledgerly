import type { ProjectCurrencyDto } from '@/entities/project';

export interface DashboardPreviousYearDto {
  year: number;
  income: number;
  expenses: number;
  profit: number;
  margin: number;
  totalDocuments: number;
}

export interface BudgetVsActualEntryDto {
  projectId: string;
  name: string;
  currency: ProjectCurrencyDto;
  budget: number | null;
  income: number;
  expenses: number;
  consumptionPct: number | null;
}

export interface VatByQuarterEntryDto {
  quarter: 1 | 2 | 3 | 4;
  outputVat: number;
  inputVat: number;
  balance: number;
}

export interface CashflowForecastBucketDto {
  inflow: number;
  outflow: number;
  net: number;
}

export interface CashflowForecastMonthDto extends CashflowForecastBucketDto {
  month: string;
}

export interface CashflowForecastDto {
  overdue: CashflowForecastBucketDto;
  months: CashflowForecastMonthDto[];
}

export interface CompanyDashboardDto {
  year: number;
  availableYears: number[];
  projectCount: number;
  totalDocuments: number;
  income: number;
  expenses: number;
  profit: number;
  margin: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  amountByStatus: {
    pagado: number;
    pendiente: number;
    vencido: number;
  };
  monthlyIncome: number[];
  monthlyExpenses: number[];
  monthlyProfit: number[];
  cumulativeProfit: number[];
  monthlyMargin: number[];
  categoryTotals: {
    factura: number;
    nomina: number;
    impuesto: number;
  };
  topIssuers: { key: string; name: string | null; total: number }[];
  topProjects: {
    id: string;
    name: string;
    documentCount: number;
    total: number;
  }[];
  previousYear: DashboardPreviousYearDto;
  budgetVsActual: BudgetVsActualEntryDto[];
  vatByQuarter: VatByQuarterEntryDto[];
  cashflowForecast: CashflowForecastDto;
}
