import { Inject, Injectable } from '@nestjs/common';
import { diffTaxSourceEvents } from '../domain/tax-source-event';
import { TAX_SOURCE_REPOSITORY, TaxSourceRepository } from '../domain/tax-source.repository';
import { TAX_SOURCE_CATALOG } from '../domain/tax-source-catalog';
import type { TaxSourceStatePrimitives, TaxSourceStateView } from '../domain/tax-source-state';

const MAX_PUBLIC_CHANGES = 100;

function emptyState(source: (typeof TAX_SOURCE_CATALOG)[number]): TaxSourceStatePrimitives {
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
    updatedAt: new Date(0),
  };
}

export function toTaxSourceStateView(state: TaxSourceStatePrimitives): TaxSourceStateView {
  const changes =
    state.status === 'changed'
      ? diffTaxSourceEvents(state.acceptedEvents, state.observedEvents)
      : [];

  const {
    acceptedEvents: _acceptedEvents,
    observedEvents: _observedEvents,
    ...publicState
  } = state;
  void _acceptedEvents;
  void _observedEvents;

  return {
    ...publicState,
    version: state.observedHash?.slice(0, 12) ?? null,
    changes: changes.slice(0, MAX_PUBLIC_CHANGES),
  };
}

@Injectable()
export class ListTaxSourceStatesUseCase {
  constructor(
    @Inject(TAX_SOURCE_REPOSITORY)
    private readonly repository: TaxSourceRepository,
  ) {}

  async execute(): Promise<TaxSourceStateView[]> {
    const stored = new Map(
      (await this.repository.findAll()).map((state) => [state.sourceKey, state]),
    );

    return TAX_SOURCE_CATALOG.map((source) =>
      toTaxSourceStateView(stored.get(source.key) ?? emptyState(source)),
    );
  }
}
