export type TaxDeadlineStatus = 'pending' | 'in_progress' | 'submitted' | 'paid' | 'dismissed';

export interface GeneratedTaxDeadline {
  occurrenceKey: string;
  projectId: string;
  obligationKey: string;
  code: string;
  title: string;
  description: string;
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
  projectName: string;
  projectCode: string;
  projectColor: string | null;
}
