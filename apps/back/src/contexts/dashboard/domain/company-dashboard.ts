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

export interface CompanyDashboard {
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
}
