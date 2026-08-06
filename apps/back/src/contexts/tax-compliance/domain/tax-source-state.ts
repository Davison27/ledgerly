import type { TaxSourceChange, TaxSourceEvent } from './tax-source-event';

export type TaxSourceStateStatus = 'never_checked' | 'current' | 'changed' | 'error';

export interface TaxSourceStatePrimitives {
  sourceKey: string;
  countryCode: 'ES';
  label: string;
  format: 'ical';
  sourceUrl: string;
  feedUrl: string;
  status: TaxSourceStateStatus;
  acceptedHash: string | null;
  acceptedEvents: TaxSourceEvent[];
  observedHash: string | null;
  observedEvents: TaxSourceEvent[];
  lastCheckedAt: Date | null;
  lastSuccessfulAt: Date | null;
  lastSourceModifiedAt: Date | null;
  etag: string | null;
  lastModified: string | null;
  lastError: string | null;
  updatedAt: Date;
}

export interface TaxSourceStateView extends Omit<
  TaxSourceStatePrimitives,
  'acceptedEvents' | 'observedEvents'
> {
  version: string | null;
  changes: TaxSourceChange[];
}
