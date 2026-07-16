import { RecordExtractionFeedbackUseCase } from './record-extraction-feedback.use-case';
import { PdfReader, PdfReadResult } from '../../domain/extraction/pdf-reader.port';
import { InvoiceHint } from '../../domain/extraction/hints/invoice-hint';
import { InvoiceHintRepository, NewInvoiceHint } from '../../domain/extraction/hints/invoice-hint.repository';
import { FACTURAE_SAMPLE_XML } from '../../domain/extraction/__fixtures__/facturae-sample.xml';

class FakePdfReader implements PdfReader {
  constructor(private readonly result: PdfReadResult) {}

  read(): Promise<PdfReadResult> {
    return Promise.resolve(this.result);
  }
}

class InMemoryHintRepository implements InvoiceHintRepository {
  private hints: InvoiceHint[] = [];
  private nextId = 1;

  seed(hints: InvoiceHint[]): void {
    this.hints = hints;
  }

  findByIssuer(issuerTaxId: string): Promise<InvoiceHint[]> {
    return Promise.resolve(this.hints.filter((hint) => hint.issuerTaxId === issuerTaxId));
  }

  findAll(): Promise<InvoiceHint[]> {
    return Promise.resolve([...this.hints]);
  }

  upsert(hint: NewInvoiceHint): Promise<void> {
    const existingIndex = this.hints.findIndex(
      (h) => h.issuerTaxId === hint.issuerTaxId && h.field === hint.field,
    );

    if (existingIndex === -1) {
      this.hints.push({ id: `hint-${this.nextId++}`, occurrences: 1, ...hint });
      return Promise.resolve();
    }

    const existing = this.hints[existingIndex];
    const sameAnchor =
      existing.anchorKind === hint.anchorKind &&
      existing.anchorLabel === hint.anchorLabel &&
      existing.lineOffset === hint.lineOffset;

    this.hints[existingIndex] = {
      ...existing,
      ...hint,
      occurrences: sameAnchor ? existing.occurrences + 1 : 1,
    };
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.hints = this.hints.filter((hint) => hint.id !== id);
    return Promise.resolve();
  }
}

describe('RecordExtractionFeedbackUseCase', () => {
  it('learns a new hint from a corrected field on the first correction', async () => {
    const text = ['Mi Empresa SL', 'CIF: B12345678', 'Ref interna: REF-9', 'TOTAL: 100,00 EUR'].join('\n');
    const pdfReader = new FakePdfReader({ text, attachments: [] });
    const hintRepository = new InMemoryHintRepository();
    const useCase = new RecordExtractionFeedbackUseCase(pdfReader, hintRepository);

    await useCase.execute({
      fileBuffer: Buffer.from('fake-pdf'),
      submitted: { issuerTaxId: 'B12345678', invoiceNumber: 'REF-9' },
    });

    const hints = await hintRepository.findByIssuer('B12345678');
    expect(hints).toHaveLength(1);
    expect(hints[0]).toMatchObject({
      field: 'invoiceNumber',
      anchorKind: 'inline',
      anchorLabel: 'Ref interna',
      sampleValue: 'REF-9',
      occurrences: 1,
    });
  });

  it('replaces the anchor and resets occurrences when a later correction locates a different anchor', async () => {
    const hintRepository = new InMemoryHintRepository();
    hintRepository.seed([
      {
        id: 'hint-1',
        issuerTaxId: 'B12345678',
        field: 'invoiceNumber',
        anchorKind: 'inline',
        anchorLabel: 'Ref interna',
        lineOffset: 0,
        sampleValue: 'REF-OLD',
        occurrences: 4,
      },
    ]);
    // A later invoice from the same issuer with a differently-labelled
    // field: the old anchor can no longer be located, so the hint would
    // show nothing for invoiceNumber, and the user's correction is learned
    // against the new label instead of reinforcing the stale one.
    const text = ['Mi Empresa SL', 'CIF: B12345678', 'Codigo interno: REF-20', 'TOTAL: 100,00 EUR'].join('\n');
    const pdfReader = new FakePdfReader({ text, attachments: [] });
    const useCase = new RecordExtractionFeedbackUseCase(pdfReader, hintRepository);

    await useCase.execute({
      fileBuffer: Buffer.from('fake-pdf'),
      submitted: { issuerTaxId: 'B12345678', invoiceNumber: 'REF-20' },
    });

    const hints = await hintRepository.findByIssuer('B12345678');
    expect(hints).toHaveLength(1);
    expect(hints[0]).toMatchObject({
      anchorLabel: 'Codigo interno',
      sampleValue: 'REF-20',
      occurrences: 1,
    });
  });

  it('does nothing when the submitted value already matches what hints already show', async () => {
    const text = ['Mi Empresa SL', 'CIF: B12345678', 'Ref interna: REF-9', 'TOTAL: 100,00 EUR'].join('\n');
    const pdfReader = new FakePdfReader({ text, attachments: [] });
    const hintRepository = new InMemoryHintRepository();
    hintRepository.seed([
      {
        id: 'hint-1',
        issuerTaxId: 'B12345678',
        field: 'invoiceNumber',
        anchorKind: 'inline',
        anchorLabel: 'Ref interna',
        lineOffset: 0,
        sampleValue: 'REF-9',
        occurrences: 5,
      },
    ]);
    const useCase = new RecordExtractionFeedbackUseCase(pdfReader, hintRepository);

    await useCase.execute({
      fileBuffer: Buffer.from('fake-pdf'),
      submitted: { issuerTaxId: 'B12345678', invoiceNumber: 'REF-9' },
    });

    const hints = await hintRepository.findByIssuer('B12345678');
    expect(hints[0].occurrences).toBe(5);
  });

  it('does not learn anything from a structured (Facturae) invoice', async () => {
    const pdfReader = new FakePdfReader({
      text: 'irrelevant text layer',
      attachments: [{ filename: 'facturae.xml', content: Buffer.from(FACTURAE_SAMPLE_XML, 'utf-8') }],
    });
    const hintRepository = new InMemoryHintRepository();
    const useCase = new RecordExtractionFeedbackUseCase(pdfReader, hintRepository);

    await useCase.execute({
      fileBuffer: Buffer.from('fake-pdf'),
      submitted: { issuerTaxId: 'B87654321', invoiceNumber: 'CORRECTED-NUMBER' },
    });

    expect(await hintRepository.findAll()).toEqual([]);
  });

  it('does nothing when there is no issuer tax id to key the memory by', async () => {
    const pdfReader = new FakePdfReader({ text: 'Unrelated text with no CIF at all.', attachments: [] });
    const hintRepository = new InMemoryHintRepository();
    const useCase = new RecordExtractionFeedbackUseCase(pdfReader, hintRepository);

    await useCase.execute({ fileBuffer: Buffer.from('fake-pdf'), submitted: { invoiceNumber: 'F-1' } });

    expect(await hintRepository.findAll()).toEqual([]);
  });

  it('never throws, even when the PDF has no usable text layer', async () => {
    const pdfReader = new FakePdfReader({ text: '   \n  ', attachments: [] });
    const hintRepository = new InMemoryHintRepository();
    const useCase = new RecordExtractionFeedbackUseCase(pdfReader, hintRepository);

    await expect(
      useCase.execute({ fileBuffer: Buffer.from('fake-pdf'), submitted: { issuerTaxId: 'B12345678' } }),
    ).resolves.toBeUndefined();
  });
});
