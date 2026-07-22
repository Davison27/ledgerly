export interface PdfAttachment {
  filename: string;
  content: Buffer;
}

export interface PdfReadResult {
  text: string;
  attachments: PdfAttachment[];
}

export const PDF_READER = Symbol('PdfReader');

export interface PdfReader {
  read(buffer: Buffer): Promise<PdfReadResult>;
}
