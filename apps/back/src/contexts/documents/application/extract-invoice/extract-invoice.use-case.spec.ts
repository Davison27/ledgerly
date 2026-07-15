import { ExtractInvoiceUseCase } from './extract-invoice.use-case';
import { PdfReader, PdfReadResult } from '../../domain/extraction/pdf-reader.port';
import { PdfNoTextLayerException } from '../../domain/errors/pdf-no-text-layer.exception';
import { FACTURAE_SAMPLE_XML } from '../../domain/extraction/__fixtures__/facturae-sample.xml';
import { FACTURX_SAMPLE_XML } from '../../domain/extraction/__fixtures__/facturx-sample.xml';

class FakePdfReader implements PdfReader {
  constructor(private readonly result: PdfReadResult) {}

  read(): Promise<PdfReadResult> {
    return Promise.resolve(this.result);
  }
}

describe('ExtractInvoiceUseCase', () => {
  it('prefers a Facturae attachment over the text layer when both are present', async () => {
    const useCase = new ExtractInvoiceUseCase(
      new FakePdfReader({
        text: 'Some unrelated text layer that would parse as heuristic',
        attachments: [{ filename: 'facturae.xml', content: Buffer.from(FACTURAE_SAMPLE_XML, 'utf-8') }],
      }),
    );

    const result = await useCase.execute(Buffer.from('fake-pdf'));

    expect(result.source).toBe('facturae');
    expect(result.confidence).toBe('high');
    expect(result.warnings).toEqual([]);
    expect(result.fields.issuerName).toBe('Consultoria Iberica de Sistemas SA');
    expect(result.fields.invoiceNumber).toBe('2026-045');
    expect(result.fields.amount).toBe(605);
    expect(result.fields.type).toBe('factura');
    expect(result.fields.name).toBe('Consultoria Iberica de Sistemas SA - 2026-045');
  });

  it('parses a Factur-X attachment when no Facturae document is present', async () => {
    const useCase = new ExtractInvoiceUseCase(
      new FakePdfReader({
        text: '',
        attachments: [{ filename: 'factur-x.xml', content: Buffer.from(FACTURX_SAMPLE_XML, 'utf-8') }],
      }),
    );

    const result = await useCase.execute(Buffer.from('fake-pdf'));

    expect(result.source).toBe('facturx');
    expect(result.confidence).toBe('high');
    expect(result.fields.invoiceNumber).toBe('FX-2026-000123');
    expect(result.fields.amount).toBe(1210);
  });

  it('falls back to text-layer heuristics when there is no structured attachment', async () => {
    const useCase = new ExtractInvoiceUseCase(
      new FakePdfReader({
        text: ['Mi Empresa SL', 'CIF: B12345678', 'Factura numero de factura: F-1', 'TOTAL: 100,00 EUR'].join('\n'),
        attachments: [],
      }),
    );

    const result = await useCase.execute(Buffer.from('fake-pdf'));

    expect(result.source).toBe('heuristic');
    expect(result.confidence).toBe('partial');
    expect(result.fields.amount).toBe(100);
    expect(result.fields.type).toBe('factura');
  });

  it('reports "low" confidence when heuristics found no supporting fields', async () => {
    const useCase = new ExtractInvoiceUseCase(
      new FakePdfReader({
        text: 'Unrelated text with no invoice-like structure at all.',
        attachments: [],
      }),
    );

    const result = await useCase.execute(Buffer.from('fake-pdf'));

    expect(result.source).toBe('heuristic');
    expect(result.confidence).toBe('low');
  });

  it('throws PdfNoTextLayerException when there is no text and no structured attachment', async () => {
    const useCase = new ExtractInvoiceUseCase(
      new FakePdfReader({
        text: '   \n  ',
        attachments: [],
      }),
    );

    await expect(useCase.execute(Buffer.from('fake-pdf'))).rejects.toThrow(PdfNoTextLayerException);
  });

  it('ignores non-XML / unrelated attachments and falls back to heuristics', async () => {
    const useCase = new ExtractInvoiceUseCase(
      new FakePdfReader({
        text: 'CIF: B12345678\nTOTAL: 50,00 EUR',
        attachments: [{ filename: 'logo.png', content: Buffer.from([0x89, 0x50, 0x4e, 0x47]) }],
      }),
    );

    const result = await useCase.execute(Buffer.from('fake-pdf'));

    expect(result.source).toBe('heuristic');
  });
});
