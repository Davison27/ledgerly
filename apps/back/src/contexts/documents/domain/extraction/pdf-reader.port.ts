export interface PdfAttachment {
  filename: string;
  content: Buffer;
}

export interface PdfTextCell {
  x: number;
  width: number;
  text: string;
}

export interface PdfTextLine {
  page: number;
  y: number;
  height: number;
  cells: PdfTextCell[];
}

export interface PdfReadResult {
  text: string;
  attachments: PdfAttachment[];
  pageCount?: number;
  lines?: PdfTextLine[];
}

export const PDF_READER = Symbol('PdfReader');

export interface PdfReader {
  read(buffer: Buffer): Promise<PdfReadResult>;
}
