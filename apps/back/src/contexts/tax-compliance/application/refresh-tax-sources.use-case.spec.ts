import { createHash } from 'node:crypto';
import { RefreshTaxSourcesUseCase } from './refresh-tax-sources.use-case';
import { ReviewTaxSourceUseCase } from './review-tax-source.use-case';
import { TAX_SOURCE_CATALOG } from '../domain/tax-source-catalog';
import type { TaxSourceEvent } from '../domain/tax-source-event';
import type {
  TaxSourceFetchOptions,
  TaxSourceFetchResult,
  TaxSourceFetcher,
} from '../domain/tax-source-fetcher';
import type { TaxSourceRepository } from '../domain/tax-source.repository';
import type { TaxSourceStatePrimitives } from '../domain/tax-source-state';

const EVENTS: TaxSourceEvent[] = [
  {
    uid: 'event-1',
    summary: 'Modelo 303 · IVA',
    description: null,
    startDate: '2026-04-20',
    endDate: '2026-04-21',
    lastModified: null,
  },
];

function hash(events: TaxSourceEvent[]): string {
  return createHash('sha256').update(JSON.stringify(events)).digest('hex');
}

class InMemorySourceRepository implements TaxSourceRepository {
  private readonly states = new Map<string, TaxSourceStatePrimitives>();

  findAll(): Promise<TaxSourceStatePrimitives[]> {
    return Promise.resolve([...this.states.values()]);
  }

  findByKey(sourceKey: string): Promise<TaxSourceStatePrimitives | null> {
    return Promise.resolve(this.states.get(sourceKey) ?? null);
  }

  save(state: TaxSourceStatePrimitives): Promise<void> {
    this.states.set(state.sourceKey, state);
    return Promise.resolve();
  }
}

class FakeSourceFetcher implements TaxSourceFetcher {
  events = EVENTS;

  fetch(
    source: (typeof TAX_SOURCE_CATALOG)[number],
    options: TaxSourceFetchOptions,
  ): Promise<TaxSourceFetchResult> {
    void source;
    void options;
    return Promise.resolve({
      notModified: false,
      contentHash: hash(this.events),
      events: this.events,
      fetchedAt: new Date('2026-08-06T08:00:00.000Z'),
      sourceModifiedAt: new Date('2026-08-05T08:00:00.000Z'),
      etag: 'etag-1',
      lastModified: 'Wed, 05 Aug 2026 08:00:00 GMT',
    });
  }
}

describe('RefreshTaxSourcesUseCase', () => {
  it('baselines sources, detects a change and lets an admin review it', async () => {
    const repository = new InMemorySourceRepository();
    const fetcher = new FakeSourceFetcher();
    const refresh = new RefreshTaxSourcesUseCase(repository, fetcher);
    const review = new ReviewTaxSourceUseCase(repository);

    const baseline = await refresh.execute();
    expect(baseline.sources.every((source) => source.status === 'current')).toBe(true);

    fetcher.events = [{ ...EVENTS[0], startDate: '2026-04-21' }];
    const changed = await refresh.execute();
    const iva = changed.sources.find((source) => source.sourceKey === 'es-aeat-iva');

    expect(iva).toMatchObject({ status: 'changed' });
    expect(iva?.changes).toEqual([expect.objectContaining({ kind: 'modified', uid: 'event-1' })]);

    const reviewed = await review.execute('es-aeat-iva');
    expect(reviewed).toMatchObject({ status: 'current', changes: [] });
  });
});
