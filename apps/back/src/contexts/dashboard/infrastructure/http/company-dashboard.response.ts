import {
  AmountByStatus,
  BudgetVsActual,
  CashflowForecast,
  CategoryTotals,
  CompanyDashboard,
  PreviousYearSummary,
  TopIssuer,
  TopProject,
  VatByQuarter,
} from '../../domain/company-dashboard';

export class CompanyDashboardResponse {
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

  static fromResult(result: CompanyDashboard): CompanyDashboardResponse {
    const response = new CompanyDashboardResponse();

    response.year = result.year;
    response.availableYears = result.availableYears;
    response.projectCount = result.projectCount;
    response.totalDocuments = result.totalDocuments;
    response.income = result.income;
    response.expenses = result.expenses;
    response.profit = result.profit;
    response.margin = result.margin;
    response.paidCount = result.paidCount;
    response.pendingCount = result.pendingCount;
    response.overdueCount = result.overdueCount;
    response.amountByStatus = result.amountByStatus;
    response.monthlyIncome = result.monthlyIncome;
    response.monthlyExpenses = result.monthlyExpenses;
    response.monthlyProfit = result.monthlyProfit;
    response.cumulativeProfit = result.cumulativeProfit;
    response.monthlyMargin = result.monthlyMargin;
    response.categoryTotals = result.categoryTotals;
    response.topIssuers = result.topIssuers;
    response.topProjects = result.topProjects;
    response.previousYear = result.previousYear;
    response.budgetVsActual = result.budgetVsActual;
    response.vatByQuarter = result.vatByQuarter;
    response.cashflowForecast = result.cashflowForecast;

    return response;
  }
}
