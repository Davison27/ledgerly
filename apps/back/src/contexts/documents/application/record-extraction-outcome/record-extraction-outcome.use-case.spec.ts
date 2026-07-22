import { RecordExtractionOutcomeUseCase } from './record-extraction-outcome.use-case';
import { PdfReader, PdfReadResult } from '../../domain/extraction/pdf-reader.port';
import { InvoiceHint } from '../../domain/extraction/hints/invoice-hint';
import { InvoiceHintRepository } from '../../domain/extraction/hints/invoice-hint.repository';
import {
  ExtractionOutcomeRepository,
} from '../../domain/extraction/quality/extraction-outcome.repository';
import { ExtractionQualityStats, NewExtractionOutcome } from '../../domain/extraction/quality/extraction-outcome';
import { FACTURAE_SAMPLE_XML } from '../../domain/extraction/__fixtures__/facturae-sample.xml';

class FakePdfReader implements PdfReader {
  constructor(private readonly result: PdfReadResult) {}

  read(): Promise<PdfReadResult> {
    return Promise.resolve(this.result);
  }
}

class InMemoryHintRepository implements InvoiceHintRepository {
  private hints: InvoiceHint[] = [];

  seed(hints: InvoiceHint[]): void {
    this.hints = hints;
  }

  findByIssuer(issuerName: string): Promise<InvoiceHint[]> {
    return Promise.resolve(this.hints.filter((hint) => hint.issuerName === issuerName));
  }

  findAll(): Promise<InvoiceHint[]> {
    return Promise.resolve([...this.hints]);
  }

  upsert(): Promise<void> {
    return Promise.resolve();
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }
}

class InMemoryOutcomeRepository implements ExtractionOutcomeRepository {
  saved: NewExtractionOutcome[] = [];

  save(outcome: NewExtractionOutcome): Promise<void> {
    this.saved.push(outcome);
    return Promise.resolve();
  }

  aggregate(): Promise<ExtractionQualityStats> {
    throw new Error('not used in this spec');
  }
}

describe('RecordExtractionOutcomeUseCase', () => {
  it('records a high-confidence structured (Facturae) outcome and counts fields the user corrected', async () => {
    const pdfReader = new FakePdfReader({
      text: 'irrelevant text layer',
      attachments: [{ filename: 'facturae.xml', content: Buffer.from(FACTURAE_SAMPLE_XML, 'utf-8') }],
    });
    const hintRepository = new InMemoryHintRepository();
    const outcomeRepository = new InMemoryOutcomeRepository();
    const useCase = new RecordExtractionOutcomeUseCase(pdfReader, hintRepository, outcomeRepository);

    await useCase.execute({
      fileBuffer: Buffer.from('fake-pdf'),
      submitted: {
        issuerName: 'Consultoria Iberica de Sistemas SA',
        invoiceNumber: '2026-045',
        amount: 999,
      },
    });

    expect(outcomeRepository.saved).toHaveLength(1);
    expect(outcomeRepository.saved[0]).toMatchObject({
      source: 'facturae',
      confidence: 'high',
      correctedFields: 1,
      issuerName: 'Consultoria Iberica de Sistemas SA',
    });
  });

  it('records a partial-confidence heuristic outcome with zero corrections when submitted matches shown', async () => {
    const text = ['Mi Empresa SL', 'CIF: B12345678', 'Fecha: 15/03/2026', 'TOTAL: 100,00 EUR'].join('\n');
    const pdfReader = new FakePdfReader({ text, attachments: [] });
    const hintRepository = new InMemoryHintRepository();
    const outcomeRepository = new InMemoryOutcomeRepository();
    const useCase = new RecordExtractionOutcomeUseCase(pdfReader, hintRepository, outcomeRepository);

    await useCase.execute({
      fileBuffer: Buffer.from('fake-pdf'),
      submitted: { issuerName: 'Mi Empresa SL', issuerTaxId: 'B12345678', date: '2026-03-15', amount: 100 },
    });

    expect(outcomeRepository.saved).toHaveLength(1);
    expect(outcomeRepository.saved[0]).toMatchObject({
      source: 'heuristic',
      confidence: 'partial',
      correctedFields: 0,
    });
  });

  it('applies learned hints before comparing, matching what the user would actually have been shown', async () => {
    const text = ['Mi Empresa SL', 'CIF: B12345678', 'Ref interna: REF-9', 'TOTAL: 100,00 EUR'].join('\n');
    const pdfReader = new FakePdfReader({ text, attachments: [] });
    const hintRepository = new InMemoryHintRepository();
    hintRepository.seed([
      {
        id: 'hint-1',
        issuerName: 'MI EMPRESA SL',
        field: 'invoiceNumber',
        anchorKind: 'inline',
        anchorLabel: 'Ref interna',
        lineOffset: 0,
        sampleValue: 'REF-9',
        occurrences: 3,
      },
    ]);
    const outcomeRepository = new InMemoryOutcomeRepository();
    const useCase = new RecordExtractionOutcomeUseCase(pdfReader, hintRepository, outcomeRepository);

    await useCase.execute({
      fileBuffer: Buffer.from('fake-pdf'),
      submitted: { issuerName: 'Mi Empresa SL', invoiceNumber: 'REF-9' },
    });

    expect(outcomeRepository.saved[0].correctedFields).toBe(0);
  });

  it('does nothing when the PDF has no usable text layer and is not structured', async () => {
    const pdfReader = new FakePdfReader({ text: '   \n  ', attachments: [] });
    const hintRepository = new InMemoryHintRepository();
    const outcomeRepository = new InMemoryOutcomeRepository();
    const useCase = new RecordExtractionOutcomeUseCase(pdfReader, hintRepository, outcomeRepository);

    await useCase.execute({ fileBuffer: Buffer.from('fake-pdf'), submitted: { issuerName: 'Mi Empresa SL' } });

    expect(outcomeRepository.saved).toHaveLength(0);
  });
});
