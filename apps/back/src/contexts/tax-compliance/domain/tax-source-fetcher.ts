import type { TaxSourceDefinition } from './tax-source-catalog';
import type { TaxSourceEvent } from './tax-source-event';

export const TAX_SOURCE_FETCHER = Symbol('TaxSourceFetcher');

export interface TaxSourceFetchOptions {
  etag: string | null;
  lastModified: string | null;
}

export interface TaxSourceFetchResult {
  notModified: boolean;
  contentHash: string | null;
  events: TaxSourceEvent[];
  fetchedAt: Date;
  sourceModifiedAt: Date | null;
  etag: string | null;
  lastModified: string | null;
}

export interface TaxSourceFetcher {
  fetch(source: TaxSourceDefinition, options: TaxSourceFetchOptions): Promise<TaxSourceFetchResult>;
}
