export const DASHBOARD_DATA_PROVIDER = Symbol('DashboardDataProvider');

export interface DashboardDocumentRow {
  type: 'invoice' | 'payroll' | 'tax';
  amount: number;
  month: number;
  status: 'paid' | 'pending' | 'overdue';
  issuerName: string | null;
  projectId: string;
  date: string;
  dueDate: string | null;
  taxAmount: number | null;
  direction: 'income' | 'expense';
}

export interface DashboardProjectSummary {
  id: string;
  name: string;
}

export interface DashboardProjectRow {
  id: string;
  name: string;
  budget: number | null;
  currency: string;
}

export interface DashboardLeaseExpenseRow {
  projectId: string;
  amount: number;
  date: string;
}

export interface DashboardDataProvider {
  findAllDocumentRows(): Promise<DashboardDocumentRow[]>;
  findAllProjectSummaries(): Promise<DashboardProjectSummary[]>;
  findAllProjectRows(): Promise<DashboardProjectRow[]>;
  findAllLeaseExpenseRows(): Promise<DashboardLeaseExpenseRow[]>;
}
