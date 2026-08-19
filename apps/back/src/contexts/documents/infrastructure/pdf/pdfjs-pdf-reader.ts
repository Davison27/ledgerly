import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PdfAttachment, PdfReadResult, PdfReader } from '../../domain/extraction/pdf-reader.port';
import { PdfPageLimitExceededException } from '../../domain/errors/pdf-page-limit-exceeded.exception';

// eslint-disable-next-line @typescript-eslint/no-implied-eval
const dynamicImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<unknown>;

interface PdfJsTextItem {
  str: string;
  hasEOL: boolean;
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

    const text = await this.readText(document);
    const attachments = await this.readAttachments(document);

    return { text, attachments, pageCount: document.numPages };
  }

  private async readText(document: PdfJsDocument): Promise<string> {
    let text = '';
    const maxBytes = this.config?.get<number>('PDF_MAX_EXTRACTED_TEXT_BYTES', 2 * 1024 * 1024) ?? 2 * 1024 * 1024;

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();

      let line = '';
      for (const item of content.items) {
        line += item.str;
        if (Buffer.byteLength(`${text}${line}`, 'utf8') >= maxBytes) {
          return Buffer.from(`${text}${line}`, 'utf8').subarray(0, maxBytes).toString('utf8');
        }
        if (item.hasEOL) {
          text += `${line}\n`;
          line = '';
        }
      }
      if (line.length > 0) {
        text += `${line}\n`;
      }
      if (Buffer.byteLength(text, 'utf8') >= maxBytes) {
        return Buffer.from(text, 'utf8').subarray(0, maxBytes).toString('utf8');
      }
    }

    return text;
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
