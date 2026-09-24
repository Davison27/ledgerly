import { readFileSync } from 'fs';
import { join } from 'path';
import { PdfjsPdfReader } from './pdfjs-pdf-reader';
import { writeMinimalPdf, MinimalPdfPage } from './__fixtures__/minimal-pdf-writer';

function loadFixture(name: string): Buffer {
  return readFileSync(join(__dirname, '__fixtures__', name));
}

function loadCorpusFixturePages(name: string): MinimalPdfPage[] {
  const raw = readFileSync(
    join(__dirname, '../../application/extract-invoice/__fixtures__/invoice-corpus', name),
    'utf8',
  );
  return (JSON.parse(raw) as { pages: MinimalPdfPage[] }).pages;
}

describe('PdfjsPdfReader', () => {
  const reader = new PdfjsPdfReader();

  it('extracts the text layer of a text-based PDF', async () => {
    const result = await reader.read(loadFixture('heuristic-invoice.pdf'));

    expect(result.text).toContain('Suministros Industriales del Norte SL');
    expect(result.text).toContain('TOTAL: 1.210,00 EUR');
    expect(result.attachments).toEqual([]);
  });

  it('extracts an embedded factur-x.xml attachment alongside the text layer', async () => {
    const result = await reader.read(loadFixture('facturx-invoice.pdf'));

    expect(result.text).toContain('Suministros Industriales del Norte SL');
    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0].filename).toBe('factur-x.xml');
    expect(result.attachments[0].content.toString('utf-8')).toContain('CrossIndustryInvoice');
  });

  it('extracts an embedded facturae.xml attachment alongside the text layer', async () => {
    const result = await reader.read(loadFixture('facturae-invoice.pdf'));

    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0].filename).toBe('facturae.xml');
    expect(result.attachments[0].content.toString('utf-8')).toContain('Facturae');
  });

  it('returns an empty (whitespace-only) text for an image-only / no-text PDF', async () => {
    const result = await reader.read(loadFixture('no-text.pdf'));

    expect(result.text.trim()).toBe('');
    expect(result.attachments).toEqual([]);
  });

  it('keeps label and value columns apart in the layout-aware lines', async () => {
    const pages = loadCorpusFixturePages('label-value-columns.json');
    const buffer = writeMinimalPdf(pages);

    const result = await reader.read(buffer);

    const lines = result.lines ?? [];
    const totalLine = lines.find((line) => line.cells.some((cell) => cell.text.includes('TOTAL A PAGAR')));
    expect(totalLine).toBeDefined();
    expect(totalLine?.cells.map((cell) => cell.text)).toEqual(
      expect.arrayContaining(['TOTAL A PAGAR', '1.590,00']),
    );
    expect(totalLine?.cells.some((cell) => cell.text.includes('TOTAL A PAGAR') && cell.text.includes('1.590,00'))).toBe(
      false,
    );

    const baseAmountLine = lines.find((line) => line.cells.some((cell) => cell.text.includes('1.500,00')));
    expect(baseAmountLine?.cells.some((cell) => cell.text.includes('20/05/2026'))).toBe(false);
  });
});
