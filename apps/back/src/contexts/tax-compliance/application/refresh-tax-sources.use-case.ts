import { Inject, Injectable } from '@nestjs/common';
import { diffTaxSourceEvents, sortTaxSourceEvents } from '../domain/tax-source-event';
import { TAX_SOURCE_CATALOG } from '../domain/tax-source-catalog';
import { TAX_SOURCE_FETCHER, TaxSourceFetcher } from '../domain/tax-source-fetcher';
import { TAX_SOURCE_REPOSITORY, TaxSourceRepository } from '../domain/tax-source.repository';
import type { TaxSourceStatePrimitives, TaxSourceStateView } from '../domain/tax-source-state';
import { toTaxSourceStateView } from './list-tax-source-states.use-case';

export interface RefreshTaxSourcesResult {
  checkedAt: string;
  sources: TaxSourceStateView[];
}

function initialState(
  source: (typeof TAX_SOURCE_CATALOG)[number],
  now: Date,
): TaxSourceStatePrimitives {
  return {
    sourceKey: source.key,
    countryCode: source.countryCode,
    label: source.label,
    format: source.format,
    sourceUrl: source.sourceUrl,
    feedUrl: source.feedUrl,
    status: 'never_checked',
    acceptedHash: null,
    acceptedEvents: [],
    observedHash: null,
    observedEvents: [],
    lastCheckedAt: null,
    lastSuccessfulAt: null,
    lastSourceModifiedAt: null,
    etag: null,
    lastModified: null,
    lastError: null,
    updatedAt: now,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 500) : 'Unknown source error';
}

@Injectable()
export class RefreshTaxSourcesUseCase {
  constructor(
    @Inject(TAX_SOURCE_REPOSITORY)
    private readonly repository: TaxSourceRepository,
    @Inject(TAX_SOURCE_FETCHER)
    private readonly fetcher: TaxSourceFetcher,
  ) {}

  async execute(): Promise<RefreshTaxSourcesResult> {
    for (const source of TAX_SOURCE_CATALOG) {
      const now = new Date();
      const current = (await this.repository.findByKey(source.key)) ?? initialState(source, now);

      try {
        const result = await this.fetcher.fetch(source, {
          etag: current.etag,
          lastModified: current.lastModified,
        });

        if (result.notModified) {
          await this.repository.save({
            ...current,
            lastCheckedAt: result.fetchedAt,
            lastSuccessfulAt: result.fetchedAt,
            lastSourceModifiedAt: result.sourceModifiedAt ?? current.lastSourceModifiedAt,
            etag: result.etag,
            lastModified: result.lastModified,
            lastError: null,
            updatedAt: result.fetchedAt,
          });
          continue;
        }

        const observedEvents = sortTaxSourceEvents(result.events);
        const changes = diffTaxSourceEvents(current.acceptedEvents, observedEvents);
        const hasAcceptedVersion = current.acceptedHash !== null;
        const changed = hasAcceptedVersion && changes.length > 0;

        await this.repository.save({
          ...current,
          status: changed ? 'changed' : 'current',
          acceptedHash: changed ? current.acceptedHash : result.contentHash,
          acceptedEvents: changed ? current.acceptedEvents : observedEvents,
          observedHash: result.contentHash,
          observedEvents,
          lastCheckedAt: result.fetchedAt,
          lastSuccessfulAt: result.fetchedAt,
          lastSourceModifiedAt: result.sourceModifiedAt,
          etag: result.etag,
          lastModified: result.lastModified,
          lastError: null,
          updatedAt: result.fetchedAt,
        });
      } catch (error) {
        await this.repository.save({
          ...current,
          status: current.status === 'changed' ? 'changed' : 'error',
          lastCheckedAt: now,
          lastError: errorMessage(error),
          updatedAt: now,
        });
      }
    }

    const states = new Map(
      (await this.repository.findAll()).map((state) => [state.sourceKey, state]),
    );
    return {
      checkedAt: new Date().toISOString(),
      sources: TAX_SOURCE_CATALOG.map((source) =>
        toTaxSourceStateView(states.get(source.key) ?? initialState(source, new Date(0))),
      ),
    };
  }
}
