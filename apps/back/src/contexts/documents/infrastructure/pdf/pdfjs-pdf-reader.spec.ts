import { readFileSync } from 'fs';
import { join } from 'path';
import { PdfjsPdfReader } from './pdfjs-pdf-reader';

function loadFixture(name: string): Buffer {
  return readFileSync(join(__dirname, '__fixtures__', name));
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
});
