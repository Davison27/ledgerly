import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { ExtractInvoiceUseCase } from './extract-invoice.use-case';
import { PdfjsPdfReader } from '../../infrastructure/pdf/pdfjs-pdf-reader';
import { InvoiceHintRepository } from '../../domain/extraction/hints/invoice-hint.repository';
import { KnownParty, KnownPartyDirectory } from '../../domain/extraction/known-party-directory.port';
import { canonicalSpanishTaxId } from '../../domain/extraction/tax-id';
import { DomainEvent } from '../../../../shared/domain/domain-event';
import { DomainEventPublisher } from '../../../../shared/domain/domain-event-publisher.port';
import { normalizeTaxId } from '../../../../shared/domain/tax-id';
import { writeMinimalPdf, MinimalPdfPage } from '../../infrastructure/pdf/__fixtures__/minimal-pdf-writer';

const FIXTURES_DIR = join(__dirname, '__fixtures__/invoice-corpus');
const NUMBER_TOLERANCE = 0.005;

type CorpusField =
  | 'issuerName'
  | 'issuerTaxId'
  | 'invoiceNumber'
  | 'date'
  | 'dueDate'
  | 'amount'
  | 'taxBase'
  | 'taxRate'
  | 'taxAmount'
  | 'irpfRate'
  | 'irpfAmount';

const CORPUS_FIELDS: CorpusField[] = [
  'issuerName',
  'issuerTaxId',
  'invoiceNumber',
  'date',
  'dueDate',
  'amount',
  'taxBase',
  'taxRate',
  'taxAmount',
  'irpfRate',
  'irpfAmount',
];

interface CorpusFixtureSupplier {
  name: string;
  taxId: string;
}

interface CorpusFixtureContext {
  companyTaxId?: string;
  suppliers?: CorpusFixtureSupplier[];
}

interface CorpusFixture {
  description: string;
  pages: MinimalPdfPage[];
  context?: CorpusFixtureContext;
  expected: Partial<Record<CorpusField, string | number | null>>;
}

interface CorpusBaseline {
  fields: Record<CorpusField, number>;
  confidentlyWrongAmount: number;
}

class NoHintsRepository implements InvoiceHintRepository {
  findByIssuer = () => Promise.resolve([]);
  findByIssuerTaxId = () => Promise.resolve([]);
  findAll = () => Promise.resolve([]);
  upsert = () => Promise.resolve();
  delete = () => Promise.resolve(false);
}

class FakeKnownPartyDirectory implements KnownPartyDirectory {
  constructor(private readonly context: CorpusFixtureContext) {}

  findCompanyTaxId(): Promise<string | null> {
    return Promise.resolve(this.context.companyTaxId ? canonicalSpanishTaxId(this.context.companyTaxId) : null);
  }

  findActiveSupplierByTaxId(canonicalTaxId: string): Promise<KnownParty | null> {
    const suppliers = this.context.suppliers ?? [];
    const match = suppliers.find((supplier) => canonicalSpanishTaxId(supplier.taxId) === canonicalTaxId);
    return Promise.resolve(match ? { name: match.name, taxId: match.taxId } : null);
  }
}

class FakeDomainEventPublisher implements DomainEventPublisher {
  published: DomainEvent[] = [];

  publish(events: DomainEvent[]): Promise<void> {
    this.published.push(...events);
    return Promise.resolve();
  }

  register(): void {}
}

function loadFixture(fileName: string): CorpusFixture {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, fileName), 'utf-8')) as CorpusFixture;
}

function loadBaseline(): CorpusBaseline {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, 'baseline.json'), 'utf-8')) as CorpusBaseline;
}

function normaliseNameForCompare(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function fieldMatches(field: CorpusField, expected: string | number | null, actual: unknown): boolean {
  if (expected === null) {
    return actual === undefined;
  }
  if (actual === undefined || typeof actual !== typeof expected) {
    return false;
  }
  if (field === 'issuerTaxId' && typeof actual === 'string' && typeof expected === 'string') {
    return normalizeTaxId(actual) === normalizeTaxId(expected);
  }
  if (field === 'issuerName' && typeof actual === 'string' && typeof expected === 'string') {
    return normaliseNameForCompare(actual) === normaliseNameForCompare(expected);
  }
  if (typeof expected === 'number') {
    return typeof actual === 'number' && Math.abs(actual - expected) <= NUMBER_TOLERANCE;
  }
  return actual === expected;
}

describe('Invoice extraction corpus (accuracy gate)', () => {
  const fixtureFileNames = readdirSync(FIXTURES_DIR)
    .filter((fileName) => fileName.endsWith('.json') && fileName !== 'baseline.json')
    .sort();
  const baseline = loadBaseline();

  it('meets or exceeds the recorded per-field accuracy baseline', async () => {
    const scored: Record<CorpusField, number> = Object.fromEntries(
      CORPUS_FIELDS.map((field) => [field, 0]),
    ) as Record<CorpusField, number>;
    const correct: Record<CorpusField, number> = Object.fromEntries(
      CORPUS_FIELDS.map((field) => [field, 0]),
    ) as Record<CorpusField, number>;
    let confidentlyWrongAmount = 0;

    for (const fixtureFileName of fixtureFileNames) {
      const fixture = loadFixture(fixtureFileName);
      const useCase = new ExtractInvoiceUseCase(
        new PdfjsPdfReader(),
        new NoHintsRepository(),
        new FakeDomainEventPublisher(),
        new FakeKnownPartyDirectory(fixture.context ?? {}),
      );

      const fileBuffer = writeMinimalPdf(fixture.pages);
      const result = await useCase.execute({ fileBuffer, fileName: fixtureFileName, fileSize: fileBuffer.length });

      for (const field of CORPUS_FIELDS) {
        if (!(field in fixture.expected)) {
          continue;
        }
        const expected = fixture.expected[field] as string | number | null;
        scored[field] += 1;
        const actual = (result.fields as Record<string, unknown>)[field];
        if (fieldMatches(field, expected, actual)) {
          correct[field] += 1;
        }
      }

      if ('amount' in fixture.expected) {
        const expectedAmount = fixture.expected.amount as number | null;
        const actualAmount = result.fields.amount;
        const amountIsWrong = !fieldMatches('amount', expectedAmount, actualAmount);
        const warningCodes: string[] = result.warnings;
        if (amountIsWrong && result.confidence !== 'low' && !warningCodes.includes('amounts_inconsistent')) {
          confidentlyWrongAmount += 1;
        }
      }
    }

    const accuracy: Record<CorpusField, number> = Object.fromEntries(
      CORPUS_FIELDS.map((field) => [field, scored[field] === 0 ? 1 : correct[field] / scored[field]]),
    ) as Record<CorpusField, number>;

    console.info('Invoice extraction corpus accuracy:');
    for (const field of CORPUS_FIELDS) {
      console.info(`  ${field}: ${correct[field]}/${scored[field]} (${accuracy[field].toFixed(3)})`);
    }
    console.info(`  confidentlyWrongAmount: ${confidentlyWrongAmount}`);

    for (const field of CORPUS_FIELDS) {
      expect(accuracy[field]).toBeGreaterThanOrEqual(baseline.fields[field]);
    }
    expect(confidentlyWrongAmount).toBeLessThanOrEqual(baseline.confidentlyWrongAmount);
  });
});
