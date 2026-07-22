export const DASHBOARD_DATA_PROVIDER = Symbol('DashboardDataProvider');

/**
 * A document row for dashboard aggregation. `status` arrives already
 * resolved through `deriveEffectiveStatus` (documents' own domain rule):
 * the dashboard never sees the raw stored status, so its counts cannot
 * drift from how the rest of the app treats an overdue document. See the
 * adapter, `RepositoryDashboardDataProvider`, which is the one place in
 * this context allowed to know that rule exists.
 */
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

/**
 * Dashboard is a read-only aggregator over `documents` and `projects`: it
 * needs a handful of fields from each, not their full repositories. This
 * port keeps that need honest instead of importing either context's domain
 * from `application/` (see the hexagonal-architecture skill, "un contexto
 * no importa de otro contexto").
 */
export interface DashboardDataProvider {
  findAllDocumentRows(): Promise<DashboardDocumentRow[]>;
  findAllProjectSummaries(): Promise<DashboardProjectSummary[]>;
  findAllProjectRows(): Promise<DashboardProjectRow[]>;
}
