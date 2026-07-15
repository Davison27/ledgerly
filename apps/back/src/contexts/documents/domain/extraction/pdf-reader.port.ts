export interface PdfAttachment {
  filename: string;
  content: Buffer;
}

export interface PdfReadResult {
  /** Concatenated text layer of every page, lines separated by `\n`. */
  text: string;
  attachments: PdfAttachment[];
}

export const PDF_READER = Symbol('PdfReader');

export interface PdfReader {
  read(buffer: Buffer): Promise<PdfReadResult>;
}
