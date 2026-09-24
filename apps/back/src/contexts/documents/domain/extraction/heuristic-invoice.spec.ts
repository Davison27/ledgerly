import { extractHeuristicInvoice } from './heuristic-invoice';
import { PdfReadResult } from './pdf-reader.port';
import { InvoiceHint } from './hints/invoice-hint';
import { InvoiceHintRepository, NewInvoiceHint } from './hints/invoice-hint.repository';
import { KnownParty, KnownPartyDirectory } from './known-party-directory.port';
import { canonicalSpanishTaxId } from './tax-id';

class InMemoryHintRepository implements InvoiceHintRepository {
  private hints: InvoiceHint[] = [];

  seed(hints: InvoiceHint[]): void {
    this.hints = hints;
  }

  findByIssuer(issuerName: string): Promise<InvoiceHint[]> {
    return Promise.resolve(this.hints.filter((hint) => hint.issuerName === issuerName));
  }

  findByIssuerTaxId(issuerTaxId: string): Promise<InvoiceHint[]> {
    return Promise.resolve(this.hints.filter((hint) => hint.issuerTaxId === issuerTaxId));
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

class FakeKnownPartyDirectory implements KnownPartyDirectory {
  constructor(
    private readonly companyTaxId: string | null = null,
    private readonly suppliers: KnownParty[] = [],
  ) {}

  findCompanyTaxId(): Promise<string | null> {
    return Promise.resolve(this.companyTaxId);
  }

  findActiveSupplierByTaxId(canonicalTaxId: string): Promise<KnownParty | null> {
    return Promise.resolve(
      this.suppliers.find((supplier) => canonicalSpanishTaxId(supplier.taxId) === canonicalTaxId) ?? null,
    );
  }
}

function readResultFor(text: string): PdfReadResult {
  return { text, attachments: [] };
}

describe('extractHeuristicInvoice', () => {
  it('runs the heuristics and computes confidence from the resulting fields', async () => {
    const text = ['Mi Empresa SL', 'CIF: B12345678', 'Fecha: 15/03/2026', 'TOTAL: 100,00 EUR'].join('\n');
    const hintRepository = new InMemoryHintRepository();

    const result = await extractHeuristicInvoice(readResultFor(text), hintRepository, new FakeKnownPartyDirectory());

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

    const result = await extractHeuristicInvoice(readResultFor(text), hintRepository, new FakeKnownPartyDirectory());

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

    const result = await extractHeuristicInvoice(readResultFor(text), hintRepository, new FakeKnownPartyDirectory(), {
      name: 'Mi Empresa SL',
    });

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

    const result = await extractHeuristicInvoice(readResult, hintRepository, new FakeKnownPartyDirectory());

    expect(result.fields.issuerName).toBe('Mi Empresa SL');
    expect(result.fields.amount).toBe(100);
  });

  it('does not attempt to learn hints when no issuer name is available', async () => {
    const hintRepository = new InMemoryHintRepository();

    const result = await extractHeuristicInvoice(
      readResultFor('Unrelated text with no structure.'),
      hintRepository,
      new FakeKnownPartyDirectory(),
    );

    expect(result.fields.issuerName).toBeUndefined();
    expect(result.confidence).toBe('low');
  });

  it('never returns the singleton company tax id as the issuer, even when it appears near the top of the document', async () => {
    const text = [
      'Ledgerly ERP SL',
      'CIF: A99988875',
      'Proveedor: Suministros del Ebro SL',
      'CIF proveedor: B64738297',
      'TOTAL: 100,00 EUR',
    ].join('\n');
    const hintRepository = new InMemoryHintRepository();

    const result = await extractHeuristicInvoice(
      readResultFor(text),
      hintRepository,
      new FakeKnownPartyDirectory('A99988875'),
    );

    expect(result.fields.issuerTaxId).toBe('B64738297');
  });

  it('replaces the extracted issuer with the stored name and tax id of a matching known supplier', async () => {
    const text = ['Comercial Rapido SL', 'CIF: B28374650', 'TOTAL: 100,00 EUR'].join('\n');
    const hintRepository = new InMemoryHintRepository();

    const result = await extractHeuristicInvoice(
      readResultFor(text),
      hintRepository,
      new FakeKnownPartyDirectory(null, [
        { name: 'Comercial Rapido y Distribucion SL', taxId: 'ESB28374650' },
      ]),
    );

    expect(result.fields.issuerName).toBe('Comercial Rapido y Distribucion SL');
    expect(result.fields.issuerTaxId).toBe('ESB28374650');
  });

  it('applies a hint found by the issuer tax id before falling back to the issuer name', async () => {
    const text = [
      'Mi Empresa SL',
      'CIF: B12345674',
      'Ref interna: REF-9',
      'Codigo interno: REF-20',
      'TOTAL: 100,00 EUR',
    ].join('\n');
    const hintRepository = new InMemoryHintRepository();
    hintRepository.seed([
      {
        id: 'hint-1',
        issuerName: 'OTRO NOMBRE SL',
        issuerTaxId: 'B12345674',
        field: 'invoiceNumber',
        anchorKind: 'inline',
        anchorLabel: 'Ref interna',
        lineOffset: 0,
        sampleValue: 'REF-9',
        occurrences: 1,
      },
      {
        id: 'hint-2',
        issuerName: 'MI EMPRESA SL',
        field: 'invoiceNumber',
        anchorKind: 'inline',
        anchorLabel: 'Codigo interno',
        lineOffset: 0,
        sampleValue: 'REF-20',
        occurrences: 1,
      },
    ]);

    const result = await extractHeuristicInvoice(readResultFor(text), hintRepository, new FakeKnownPartyDirectory());

    expect(result.fields.invoiceNumber).toBe('REF-9');
  });

  it('does not let a learned hint override a known supplier match for issuer name or tax id', async () => {
    const text = ['Comercial Rapido SL', 'CIF: B28374650', 'TOTAL: 100,00 EUR'].join('\n');
    const hintRepository = new InMemoryHintRepository();
    hintRepository.seed([
      {
        id: 'hint-1',
        issuerName: 'COMERCIAL RAPIDO SL',
        issuerTaxId: 'B28374650',
        field: 'issuerName',
        anchorKind: 'inline',
        anchorLabel: 'unused',
        lineOffset: 0,
        sampleValue: 'Learned Wrong Name',
        occurrences: 1,
      },
    ]);

    const result = await extractHeuristicInvoice(
      readResultFor(text),
      hintRepository,
      new FakeKnownPartyDirectory(null, [
        { name: 'Comercial Rapido y Distribucion SL', taxId: 'ESB28374650' },
      ]),
    );

    expect(result.fields.issuerName).toBe('Comercial Rapido y Distribucion SL');
  });
});
