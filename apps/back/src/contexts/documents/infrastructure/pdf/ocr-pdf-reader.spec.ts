import { LocalPdfOcr } from './local-pdf-ocr';
import { OcrPdfReader } from './ocr-pdf-reader';
import { PdfjsPdfReader } from './pdfjs-pdf-reader';

describe('OcrPdfReader', () => {
  it('uses local OCR only when the original PDF has no text layer', async () => {
    const read = jest
      .fn()
      .mockResolvedValueOnce({ text: '', attachments: [], pageCount: 1 })
      .mockResolvedValueOnce({ text: 'Factura\nTOTAL: 121,00', attachments: [], pageCount: 1 });
    const run = jest.fn().mockResolvedValue(Buffer.from('ocr-pdf'));
    const reader = new OcrPdfReader(
      { read } as unknown as PdfjsPdfReader,
      { isEnabled: () => true, getMaxPages: () => 12, run } as unknown as LocalPdfOcr,
    );

    const result = await reader.read(Buffer.from('source-pdf'));

    expect(run).toHaveBeenCalledWith(Buffer.from('source-pdf'));
    expect(result).toMatchObject({ text: 'Factura\nTOTAL: 121,00', ocrApplied: true });
  });

  it('does not invoke OCR for PDFs that already contain text', async () => {
    const read = jest.fn().mockResolvedValue({ text: 'Factura\nTOTAL: 121,00', attachments: [], pageCount: 1 });
    const run = jest.fn();
    const reader = new OcrPdfReader(
      { read } as unknown as PdfjsPdfReader,
      { isEnabled: () => true, getMaxPages: () => 12, run } as unknown as LocalPdfOcr,
    );

    await reader.read(Buffer.from('source-pdf'));

    expect(run).not.toHaveBeenCalled();
  });

  it('keeps the original result when OCR does not produce usable text', async () => {
    const initial = { text: '', attachments: [], pageCount: 1 };
    const read = jest.fn().mockResolvedValueOnce(initial).mockResolvedValueOnce({ ...initial });
    const run = jest.fn().mockResolvedValue(Buffer.from('ocr-pdf'));
    const reader = new OcrPdfReader(
      { read } as unknown as PdfjsPdfReader,
      { isEnabled: () => true, getMaxPages: () => 12, run } as unknown as LocalPdfOcr,
    );

    const result = await reader.read(Buffer.from('source-pdf'));

    expect(result).toBe(initial);
    expect(result.ocrApplied).toBeUndefined();
  });

  it('skips local OCR when the PDF exceeds the configured page limit', async () => {
    const read = jest.fn().mockResolvedValue({ text: '', attachments: [], pageCount: 13 });
    const run = jest.fn();
    const reader = new OcrPdfReader(
      { read } as unknown as PdfjsPdfReader,
      { isEnabled: () => true, getMaxPages: () => 12, run } as unknown as LocalPdfOcr,
    );

    const result = await reader.read(Buffer.from('source-pdf'));

    expect(run).not.toHaveBeenCalled();
    expect(result.ocrApplied).toBeUndefined();
  });
});
