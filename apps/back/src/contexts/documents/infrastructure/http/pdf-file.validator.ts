import { STORED_FILE_PLAINTEXT_LIMITS } from '../../../../shared/infrastructure/crypto/stored-file-policy';

export const MAX_PDF_FILE_SIZE_BYTES = STORED_FILE_PLAINTEXT_LIMITS.document;
const PDF_MIME_TYPE = 'application/pdf';
const PDF_MAGIC_BYTES = Buffer.from('%PDF-');

export function isValidPdfFile(file: Express.Multer.File): boolean {
  return (
    file.mimetype === PDF_MIME_TYPE &&
    file.buffer.subarray(0, PDF_MAGIC_BYTES.length).equals(PDF_MAGIC_BYTES)
  );
}
