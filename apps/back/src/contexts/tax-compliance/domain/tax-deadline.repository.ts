import { GeneratedTaxDeadline, TaxDeadlineView } from './tax-deadline';

export const TAX_DEADLINE_REPOSITORY = Symbol('TaxDeadlineRepository');

export interface TaxDeadlineFilter {
  from: string;
  to: string;
  projectId?: string;
  obligationKeys?: string[];
}

export interface TaxDeadlineRepository {
  upsert(deadline: GeneratedTaxDeadline): Promise<void>;
  findByFilter(filter: TaxDeadlineFilter): Promise<TaxDeadlineView[]>;
}
