export interface AmountByStatus {
  pagado: number;
  pendiente: number;
  vencido: number;
}

export interface CategoryTotals {
  factura: number;
  nomina: number;
  impuesto: number;
}

export interface TopIssuer {
  key: string;
  name: string | null;
  total: number;
}

export interface TopProject {
  id: string;
  name: string;
  documentCount: number;
  total: number;
}

export interface PreviousYearSummary {
  year: number;
  income: number;
  expenses: number;
  profit: number;
  margin: number;
  totalDocuments: number;
}

export interface BudgetVsActual {
  projectId: string;
  name: string;
  currency: string;
  budget: number | null;
  income: number;
  expenses: number;
  consumptionPct: number | null;
}

export interface VatByQuarter {
  quarter: number;
  outputVat: number;
  inputVat: number;
  balance: number;
}

export interface CashflowBucket {
  inflow: number;
  outflow: number;
  net: number;
}

export interface CashflowMonthBucket extends CashflowBucket {
  month: string;
}

export interface CashflowForecast {
  overdue: CashflowBucket;
  months: CashflowMonthBucket[];
}

export interface CompanyDashboard {
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
  amountByStatus: AmountByStatus;
  monthlyIncome: number[];
  monthlyExpenses: number[];
  monthlyProfit: number[];
  cumulativeProfit: number[];
  monthlyMargin: number[];
  categoryTotals: CategoryTotals;
  topIssuers: TopIssuer[];
  topProjects: TopProject[];
  previousYear: PreviousYearSummary;
  budgetVsActual: BudgetVsActual[];
  vatByQuarter: VatByQuarter[];
  cashflowForecast: CashflowForecast;
}
