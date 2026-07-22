export const DASHBOARD_DATA_PROVIDER = Symbol('DashboardDataProvider');

export interface DashboardDocumentRow {
  type: 'factura' | 'nomina' | 'impuesto';
  amount: number;
  month: number;
  status: 'pagado' | 'pendiente' | 'vencido';
  issuerName: string | null;
  projectId: string;
  date: string;
  dueDate: string | null;
  taxAmount: number | null;
  direction: 'ingreso' | 'gasto';
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

export interface DashboardDataProvider {
  findAllDocumentRows(): Promise<DashboardDocumentRow[]>;
  findAllProjectSummaries(): Promise<DashboardProjectSummary[]>;
  findAllProjectRows(): Promise<DashboardProjectRow[]>;
}
