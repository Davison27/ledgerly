import type { TaxObligationRule } from './tax-obligation-catalog';

export type TaxDeadlineStatus = 'pending' | 'in_progress' | 'submitted' | 'paid' | 'dismissed';

export interface GeneratedTaxDeadline {
  projectId: string;
  obligationKey: string;
  code: string;
  category: string;
  periodStart: string;
  periodEnd: string;
  startDate: string;
  endDate: string;
  dueDate: string;
  status: TaxDeadlineStatus;
  sourceUrl: string;
  sourceVersion: string;
}

export interface TaxDeadlineView extends GeneratedTaxDeadline {
  id: string;
  rule: TaxObligationRule;
  projectName: string;
  projectCode: string;
  projectColor: string | null;
}
