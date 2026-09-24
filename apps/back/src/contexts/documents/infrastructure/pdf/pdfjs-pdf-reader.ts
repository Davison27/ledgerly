import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PdfAttachment, PdfReadResult, PdfReader, PdfTextLine } from '../../domain/extraction/pdf-reader.port';
import { PdfPageLimitExceededException } from '../../domain/errors/pdf-page-limit-exceeded.exception';
import { buildPageLines, PositionedTextItem } from './pdf-text-layout';

// eslint-disable-next-line @typescript-eslint/no-implied-eval
const dynamicImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<unknown>;

interface PdfJsTextItem {
  str: string;
  hasEOL: boolean;
  transform: number[];
  width: number;
  height: number;
}

interface PdfJsTextContent {
  items: PdfJsTextItem[];
}

interface PdfJsPage {
  getTextContent(): Promise<PdfJsTextContent>;
}

interface PdfJsRawAttachment {
  filename: string;
  content: Uint8Array;
}

interface PdfJsDocument {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfJsPage>;
  getAttachments(): Promise<Record<string, PdfJsRawAttachment> | undefined>;
}

interface PdfJsLoadingTask {
  promise: Promise<PdfJsDocument>;
}

interface PdfJsModule {
  getDocument(params: { data: Uint8Array; verbosity?: number }): PdfJsLoadingTask;
}

async function loadPdfJs(): Promise<PdfJsModule> {
  return (await dynamicImport('pdfjs-dist/legacy/build/pdf.mjs')) as PdfJsModule;
}

@Injectable()
export class PdfjsPdfReader implements PdfReader {
  constructor(private readonly config?: ConfigService) {}

  async read(buffer: Buffer): Promise<PdfReadResult> {
    const pdfjsLib = await loadPdfJs();

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      verbosity: 0,
    });
    const document = await loadingTask.promise;
    const maxPages = this.config?.get<number>('PDF_MAX_PAGES', 100) ?? 100;
    if (document.numPages > maxPages) {
      throw new PdfPageLimitExceededException(document.numPages, maxPages);
    }

    const { text, lines } = await this.readLayout(document);
    const attachments = await this.readAttachments(document);

    return { text, attachments, pageCount: document.numPages, lines };
  }

  private async readLayout(document: PdfJsDocument): Promise<{ text: string; lines: PdfTextLine[] }> {
    const maxBytes = this.config?.get<number>('PDF_MAX_EXTRACTED_TEXT_BYTES', 2 * 1024 * 1024) ?? 2 * 1024 * 1024;

    let text = '';
    let bytes = 0;
    const lines: PdfTextLine[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();

      const items: PositionedTextItem[] = content.items.map((item) => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
        height: item.height,
      }));

      for (const line of buildPageLines(pageNumber, items)) {
        const lineText = line.cells.map((cell) => cell.text).join('\t');
        const chunk = lines.length === 0 ? lineText : `\n${lineText}`;
        const chunkBytes = Buffer.byteLength(chunk, 'utf8');

        if (bytes + chunkBytes >= maxBytes) {
          text += Buffer.from(chunk, 'utf8').subarray(0, maxBytes - bytes).toString('utf8');
          return { text, lines };
        }

        text += chunk;
        bytes += chunkBytes;
        lines.push(line);
      }
    }

    return { text, lines };
  }

  private async readAttachments(document: PdfJsDocument): Promise<PdfAttachment[]> {
    const rawAttachments = await document.getAttachments();

    if (!rawAttachments) {
      return [];
    }

    const maxAttachments = this.config?.get<number>('PDF_MAX_ATTACHMENTS', 20) ?? 20;
    const maxAttachmentBytes = this.config?.get<number>('PDF_MAX_ATTACHMENT_BYTES', 5 * 1024 * 1024) ?? 5 * 1024 * 1024;
    const maxTotalAttachmentBytes = this.config?.get<number>(
      'PDF_MAX_TOTAL_ATTACHMENT_BYTES',
      20 * 1024 * 1024,
    ) ?? 20 * 1024 * 1024;
    let totalBytes = 0;
    return Object.values(rawAttachments)
      .slice(0, maxAttachments)
      .flatMap((attachment) => {
        const content = Buffer.from(attachment.content);
        if (content.length > maxAttachmentBytes || totalBytes + content.length > maxTotalAttachmentBytes) {
          return [];
        }
        totalBytes += content.length;
        return [{ filename: attachment.filename, content }];
      });
  }
}
