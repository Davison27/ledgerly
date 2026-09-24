import { extractHeuristicInvoice } from './heuristic-invoice';
import { PdfReadResult } from './pdf-reader.port';
import { InvoiceHint } from './hints/invoice-hint';
import { InvoiceHintRepository, NewInvoiceHint } from './hints/invoice-hint.repository';

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

  upsert(hint: NewInvoiceHint): Promise<void> {
    this.hints.push({ id: `hint-${this.hints.length + 1}`, occurrences: 1, ...hint });
    return Promise.resolve();
  }

  delete(): Promise<boolean> {
    return Promise.resolve(false);
  }
}

function readResultFor(text: string): PdfReadResult {
  return { text, attachments: [] };
}

describe('extractHeuristicInvoice', () => {
  it('runs the heuristics and computes confidence from the resulting fields', async () => {
    const text = ['Mi Empresa SL', 'CIF: B12345678', 'Fecha: 15/03/2026', 'TOTAL: 100,00 EUR'].join('\n');
    const hintRepository = new InMemoryHintRepository();

    const result = await extractHeuristicInvoice(readResultFor(text), hintRepository);

    expect(result.fields.issuerName).toBe('Mi Empresa SL');
    expect(result.confidence).toBe('partial');
    expect(result.warnings).not.toContain('missing_total_amount');
  });

  it('applies a hint keyed by the extracted issuer name when no issuer key is given', async () => {
    const text = ['Mi Empresa SL', 'CIF: B12345678', 'Ref interna: REF-9', 'TOTAL: 100,00 EUR'].join('\n');
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

    const result = await extractHeuristicInvoice(readResultFor(text), hintRepository);

    expect(result.fields.invoiceNumber).toBe('REF-9');
  });

  it('applies a hint keyed by an explicit issuer name override', async () => {
    const text = ['Otro Nombre SL', 'CIF: B12345678', 'Ref interna: REF-9', 'TOTAL: 100,00 EUR'].join('\n');
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

    const result = await extractHeuristicInvoice(readResultFor(text), hintRepository, { name: 'Mi Empresa SL' });

    expect(result.fields.invoiceNumber).toBe('REF-9');
  });

  it('prefers real geometry lines over the raw text when both are present', async () => {
    const readResult: PdfReadResult = {
      text: 'irrelevant flattened text',
      attachments: [],
      lines: [
        {
          page: 1,
          y: 800,
          height: 10,
          cells: [{ x: 50, width: 100, text: 'Mi Empresa SL' }],
        },
        {
          page: 1,
          y: 780,
          height: 10,
          cells: [{ x: 50, width: 100, text: 'CIF: B12345678' }],
        },
        {
          page: 1,
          y: 760,
          height: 10,
          cells: [{ x: 50, width: 100, text: 'TOTAL: 100,00 EUR' }],
        },
      ],
    };
    const hintRepository = new InMemoryHintRepository();

    const result = await extractHeuristicInvoice(readResult, hintRepository);

    expect(result.fields.issuerName).toBe('Mi Empresa SL');
    expect(result.fields.amount).toBe(100);
  });

  it('does not attempt to learn hints when no issuer name is available', async () => {
    const hintRepository = new InMemoryHintRepository();

    const result = await extractHeuristicInvoice(readResultFor('Unrelated text with no structure.'), hintRepository);

    expect(result.fields.issuerName).toBeUndefined();
    expect(result.confidence).toBe('low');
  });
});
