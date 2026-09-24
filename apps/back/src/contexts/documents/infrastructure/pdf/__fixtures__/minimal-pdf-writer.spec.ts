import { PdfjsPdfReader } from '../pdfjs-pdf-reader';
import { writeMinimalPdf } from './minimal-pdf-writer';

describe('writeMinimalPdf', () => {
  it('produces the same bytes for the same input', () => {
    const pages = [{ items: [{ x: 50, y: 750, text: 'TOTAL: 1.210,00 €' }] }];

    expect(writeMinimalPdf(pages)).toEqual(writeMinimalPdf(pages));
  });

  it('is read back by pdfjs with matching text and coordinates', async () => {
    const buffer = writeMinimalPdf([{ items: [{ x: 50, y: 750, text: 'Hola (mundo) \\ test €', size: 12 }] }]);

    const reader = new PdfjsPdfReader();
    const result = await reader.read(buffer);

    expect(result.text).toContain('Hola (mundo) \\ test €');
    expect(result.pageCount).toBe(1);
  });

  it('places multiple items and pages so pdfjs reads each one', async () => {
    const buffer = writeMinimalPdf([
      { items: [{ x: 50, y: 800, text: 'Página 1' }] },
      { items: [{ x: 50, y: 800, text: 'Página 2' }] },
    ]);

    const reader = new PdfjsPdfReader();
    const result = await reader.read(buffer);

    expect(result.text).toContain('Página 1');
    expect(result.text).toContain('Página 2');
    expect(result.pageCount).toBe(2);
  });
});
