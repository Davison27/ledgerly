import { GetExtractionQualityUseCase } from './get-extraction-quality.use-case';
import { InvoiceHint } from '../../domain/extraction/hints/invoice-hint';
import { InvoiceHintRepository } from '../../domain/extraction/hints/invoice-hint.repository';
import {
  ExtractionOutcomeRepository,
} from '../../domain/extraction/quality/extraction-outcome.repository';
import { ExtractionQualityStats } from '../../domain/extraction/quality/extraction-outcome';

class StubOutcomeRepository implements ExtractionOutcomeRepository {
  constructor(private readonly stats: ExtractionQualityStats) {}

  save(): Promise<void> {
    return Promise.resolve();
  }

  aggregate(): Promise<ExtractionQualityStats> {
    return Promise.resolve(this.stats);
  }
}

class StubHintRepository implements InvoiceHintRepository {
  constructor(private readonly hints: InvoiceHint[]) {}

  findByIssuer(): Promise<InvoiceHint[]> {
    return Promise.resolve(this.hints);
  }

  findAll(): Promise<InvoiceHint[]> {
    return Promise.resolve(this.hints);
  }

  upsert(): Promise<void> {
    return Promise.resolve();
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }
}

function hint(issuerName: string, field: InvoiceHint['field'], occurrences: number): InvoiceHint {
  return {
    id: `${issuerName}-${field}`,
    issuerName,
    field,
    anchorKind: 'inline',
    anchorLabel: 'label',
    lineOffset: 0,
    sampleValue: 'value',
    occurrences,
  };
}

const EMPTY_STATS: ExtractionQualityStats = {
  totalExtractions: 0,
  bySource: { facturae: 0, facturx: 0, ubl: 0, heuristic: 0 },
  byConfidence: { high: 0, partial: 0, low: 0 },
  avgCorrectedFields: 0,
  correctionRate: 0,
};

describe('GetExtractionQualityUseCase', () => {
  it('returns zeros and an empty topHints list for an empty database', async () => {
    const useCase = new GetExtractionQualityUseCase(new StubOutcomeRepository(EMPTY_STATS), new StubHintRepository([]));

    const report = await useCase.execute();

    expect(report).toEqual({ ...EMPTY_STATS, topHints: [] });
  });

  it('passes through the repository-computed aggregate stats untouched', async () => {
    const stats: ExtractionQualityStats = {
      totalExtractions: 10,
      bySource: { facturae: 2, facturx: 1, ubl: 1, heuristic: 6 },
      byConfidence: { high: 4, partial: 3, low: 3 },
      avgCorrectedFields: 1.5,
      correctionRate: 0.4,
    };
    const useCase = new GetExtractionQualityUseCase(new StubOutcomeRepository(stats), new StubHintRepository([]));

    const report = await useCase.execute();

    expect(report.totalExtractions).toBe(10);
    expect(report.bySource).toEqual(stats.bySource);
    expect(report.byConfidence).toEqual(stats.byConfidence);
    expect(report.avgCorrectedFields).toBe(1.5);
    expect(report.correctionRate).toBe(0.4);
  });

  it('sorts hints by occurrences descending and caps topHints at 10', async () => {
    const hints = Array.from({ length: 12 }, (_, i) => hint(`Issuer ${i}`, 'invoiceNumber', i + 1));
    const useCase = new GetExtractionQualityUseCase(new StubOutcomeRepository(EMPTY_STATS), new StubHintRepository(hints));

    const report = await useCase.execute();

    expect(report.topHints).toHaveLength(10);
    expect(report.topHints[0]).toEqual({ issuerName: 'Issuer 11', field: 'invoiceNumber', occurrences: 12 });
    expect(report.topHints[9]).toEqual({ issuerName: 'Issuer 2', field: 'invoiceNumber', occurrences: 3 });
  });
});
