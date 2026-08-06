import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { TaxSourceDefinition } from '../../domain/tax-source-catalog';
import type {
  TaxSourceFetchOptions,
  TaxSourceFetchResult,
  TaxSourceFetcher,
} from '../../domain/tax-source-fetcher';
import { parseIcalEvents } from './ical-parser';

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;
const ALLOWED_HOSTS = new Set(['www.google.com', 'calendar.google.com']);

function assertAllowedUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname)) {
    throw new Error('The tax source URL is not in the official allowlist');
  }
  return url;
}

function parseLastModified(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

@Injectable()
export class AeatTaxSourceFetcher implements TaxSourceFetcher {
  async fetch(
    source: TaxSourceDefinition,
    options: TaxSourceFetchOptions,
  ): Promise<TaxSourceFetchResult> {
    assertAllowedUrl(source.feedUrl);

    const response = await fetch(source.feedUrl, {
      headers: {
        Accept: 'text/calendar,text/plain;q=0.9,*/*;q=0.1',
        ...(options.etag ? { 'If-None-Match': options.etag } : {}),
        ...(options.lastModified ? { 'If-Modified-Since': options.lastModified } : {}),
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    const finalUrl = assertAllowedUrl(response.url || source.feedUrl);
    if (!ALLOWED_HOSTS.has(finalUrl.hostname)) {
      throw new Error('The tax source redirected outside the official allowlist');
    }

    const fetchedAt = new Date();
    const etag = response.headers.get('etag');
    const lastModified = response.headers.get('last-modified');

    if (response.status === 304) {
      return {
        notModified: true,
        contentHash: null,
        events: [],
        fetchedAt,
        sourceModifiedAt: parseLastModified(lastModified),
        etag: etag ?? options.etag,
        lastModified: lastModified ?? options.lastModified,
      };
    }

    if (!response.ok) {
      throw new Error(`Tax source returned HTTP ${response.status}`);
    }

    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > MAX_RESPONSE_BYTES) {
      throw new Error('The tax source response is too large');
    }

    const raw = await response.text();
    if (Buffer.byteLength(raw, 'utf8') > MAX_RESPONSE_BYTES) {
      throw new Error('The tax source response is too large');
    }

    return {
      notModified: false,
      contentHash: createHash('sha256').update(raw, 'utf8').digest('hex'),
      events: parseIcalEvents(raw),
      fetchedAt,
      sourceModifiedAt: parseLastModified(lastModified),
      etag,
      lastModified,
    };
  }
}
