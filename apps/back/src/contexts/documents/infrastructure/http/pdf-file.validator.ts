export const MAX_PDF_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const PDF_MIME_TYPE = 'application/pdf';
const PDF_MAGIC_BYTES = Buffer.from('%PDF-');

export function isValidPdfFile(file: Express.Multer.File): boolean {
  return (
    file.mimetype === PDF_MIME_TYPE &&
    file.buffer.subarray(0, PDF_MAGIC_BYTES.length).equals(PDF_MAGIC_BYTES)
  );
}
