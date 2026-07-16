import { readFileSync } from 'fs';
import { join } from 'path';
import { ExtractInvoiceUseCase } from './extract-invoice.use-case';
import { PdfjsPdfReader } from '../../infrastructure/pdf/pdfjs-pdf-reader';
import { PdfNoTextLayerException } from '../../domain/errors/pdf-no-text-layer.exception';
import { InvoiceHintRepository } from '../../domain/extraction/hints/invoice-hint.repository';

function loadFixture(name: string): Buffer {
  return readFileSync(join(__dirname, '../../infrastructure/pdf/__fixtures__', name));
}

class NoHintsRepository implements InvoiceHintRepository {
  findByIssuer = () => Promise.resolve([]);
  findAll = () => Promise.resolve([]);
  upsert = () => Promise.resolve();
  delete = () => Promise.resolve();
}

describe('ExtractInvoiceUseCase + PdfjsPdfReader (end-to-end, no DB/HTTP)', () => {
  const useCase = new ExtractInvoiceUseCase(new PdfjsPdfReader(), new NoHintsRepository());

  it('extracts via the embedded Factur-X attachment for a real PDF', async () => {
    const result = await useCase.execute(loadFixture('facturx-invoice.pdf'));

    expect(result.source).toBe('facturx');
    expect(result.confidence).toBe('high');
    expect(result.fields.invoiceNumber).toBe('FX-2026-000123');
    expect(result.fields.amount).toBe(1210);
  });

  it('extracts via the embedded Facturae attachment for a real PDF', async () => {
    const result = await useCase.execute(loadFixture('facturae-invoice.pdf'));

    expect(result.source).toBe('facturae');
    expect(result.confidence).toBe('high');
    expect(result.fields.invoiceNumber).toBe('2026-045');
    expect(result.fields.amount).toBe(605);
  });

  it('falls back to text-layer heuristics for a real PDF with no attachments', async () => {
    const result = await useCase.execute(loadFixture('heuristic-invoice.pdf'));

    expect(result.source).toBe('heuristic');
    expect(result.confidence).toBe('partial');
    expect(result.fields.issuerTaxId).toBe('B12345678');
    expect(result.fields.amount).toBe(1210);
  });

  it('throws PdfNoTextLayerException for a real image-only/no-text PDF', async () => {
    await expect(useCase.execute(loadFixture('no-text.pdf'))).rejects.toThrow(PdfNoTextLayerException);
  });
});
