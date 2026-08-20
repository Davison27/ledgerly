import { getStoredFilePlaintextLimit } from '../crypto/stored-file-policy';

export const PDF_MIME_TYPE = 'application/pdf';
export const MAX_PDF_UPLOAD_SIZE_BYTES = getStoredFilePlaintextLimit('companyDocument');

export interface PdfUploadInput {
  mimetype: string;
  buffer: Buffer;
}

export function isValidPdfFile(file: PdfUploadInput): boolean {
  return (
    file.mimetype === PDF_MIME_TYPE &&
    Buffer.isBuffer(file.buffer) &&
    file.buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))
  );
}
