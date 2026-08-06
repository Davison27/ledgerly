export type TaxEntityTypeDto = 'autonomo' | 'sociedad' | 'particular';

export interface TaxComplianceSettingsDto {
  enabled: boolean;
  internalLeadDays: number;
}

export interface TaxObligationDto {
  key: string;
  countryCode: 'ES';
  code: string;
  name: string;
  description: string;
  category: 'vat' | 'withholding' | 'income';
  eligibleEntityTypes: TaxEntityTypeDto[];
  rule: Record<string, unknown>;
  sourceUrl: string;
  sourceVersion: string;
}

export interface TaxClientProfileDto {
  id: string;
  projectId: string;
  countryCode: 'ES';
  regionCode: string | null;
  entityType: TaxEntityTypeDto;
  fiscalYearStartMonth: number;
  timezone: string;
  enabled: boolean;
  obligationKeys: string[];
}

export interface SaveTaxClientProfilePayload {
  countryCode: 'ES';
  regionCode?: string | null;
  entityType: TaxEntityTypeDto;
  fiscalYearStartMonth?: number;
  timezone?: string;
  enabled?: boolean;
  obligationKeys: string[];
}

export interface UpdateTaxComplianceSettingsPayload {
  enabled?: boolean;
  internalLeadDays?: number;
}

export type TaxDeadlineStatusDto = 'pending' | 'in_progress' | 'submitted' | 'paid' | 'dismissed';

export interface TaxDeadlineDto {
  id: string;
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
  status: TaxDeadlineStatusDto;
  sourceUrl: string;
  sourceVersion: string;
  projectName: string;
  projectCode: string;
  projectColor: string | null;
}

export type TaxSourceStateStatusDto = 'never_checked' | 'current' | 'changed' | 'error';

export interface TaxSourceEventDto {
  uid: string;
  summary: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  lastModified: string | null;
}

export interface TaxSourceChangeDto {
  kind: 'added' | 'removed' | 'modified';
  uid: string;
  before: TaxSourceEventDto | null;
  after: TaxSourceEventDto | null;
}

export interface TaxSourceStateDto {
  sourceKey: string;
  countryCode: string;
  label: string;
  format: 'ical';
  sourceUrl: string;
  feedUrl: string;
  status: TaxSourceStateStatusDto;
  acceptedHash: string | null;
  observedHash: string | null;
  lastCheckedAt: string | null;
  lastSuccessfulAt: string | null;
  lastSourceModifiedAt: string | null;
  etag: string | null;
  lastModified: string | null;
  lastError: string | null;
  updatedAt: string;
  version: string | null;
  changes: TaxSourceChangeDto[];
}

export interface RefreshTaxSourcesResultDto {
  checkedAt: string;
  sources: TaxSourceStateDto[];
}
