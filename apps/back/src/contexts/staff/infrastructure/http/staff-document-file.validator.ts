const PDF_MAGIC_BYTES = Buffer.from('%PDF-');
const JPEG_MAGIC_BYTES = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_MAGIC_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP_RIFF_MAGIC_BYTES = Buffer.from('RIFF', 'ascii');
const WEBP_FORMAT_MAGIC_BYTES = Buffer.from('WEBP', 'ascii');

export const STAFF_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type StaffDocumentMimeType = (typeof STAFF_DOCUMENT_MIME_TYPES)[number];

export function isValidStaffDocumentFile(mimeType: string, buffer: Buffer): boolean {
  switch (mimeType) {
    case 'application/pdf':
      return buffer.subarray(0, PDF_MAGIC_BYTES.length).equals(PDF_MAGIC_BYTES);
    case 'image/jpeg':
      return buffer.subarray(0, JPEG_MAGIC_BYTES.length).equals(JPEG_MAGIC_BYTES);
    case 'image/png':
      return buffer.subarray(0, PNG_MAGIC_BYTES.length).equals(PNG_MAGIC_BYTES);
    case 'image/webp':
      return (
        buffer.subarray(0, 4).equals(WEBP_RIFF_MAGIC_BYTES) &&
        buffer.subarray(8, 12).equals(WEBP_FORMAT_MAGIC_BYTES)
      );
    default:
      return false;
  }
}
