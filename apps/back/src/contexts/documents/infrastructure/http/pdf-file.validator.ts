export const MAX_PDF_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const PDF_MIME_TYPE = 'application/pdf';
const PDF_MAGIC_BYTES = Buffer.from('%PDF-');

/**
 * Shared between `DocumentsController` (upload/extract scoped to a project)
 * and `DocumentsGlobalController` (the project-less `/documents/extract`
 * alias, R4 of the staff-section plan): duplicating this check per
 * controller is exactly how the two would silently drift apart.
 */
export function isValidPdfFile(file: Express.Multer.File): boolean {
  return (
    file.mimetype === PDF_MIME_TYPE &&
    file.buffer.subarray(0, PDF_MAGIC_BYTES.length).equals(PDF_MAGIC_BYTES)
  );
}
