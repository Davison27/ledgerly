import { isValidPdfFile, MAX_PDF_UPLOAD_SIZE_BYTES, PDF_MIME_TYPE } from './pdf-upload.validator';

describe('PDF upload validator', () => {
  it('accepts the PDF MIME type and signature', () => {
    expect(isValidPdfFile({ mimetype: PDF_MIME_TYPE, buffer: Buffer.from('%PDF-1.7') })).toBe(true);
  });

  it('rejects a non-PDF MIME type even when the signature matches', () => {
    expect(isValidPdfFile({ mimetype: 'application/octet-stream', buffer: Buffer.from('%PDF-1.7') })).toBe(false);
  });

  it('rejects a PDF MIME type without the signature', () => {
    expect(isValidPdfFile({ mimetype: PDF_MIME_TYPE, buffer: Buffer.from('not a PDF') })).toBe(false);
  });

  it('exposes the central ten mebibyte upload limit', () => {
    expect(MAX_PDF_UPLOAD_SIZE_BYTES).toBe(10 * 1024 * 1024);
  });
});
