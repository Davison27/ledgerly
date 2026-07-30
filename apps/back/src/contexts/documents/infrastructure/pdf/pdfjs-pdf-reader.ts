import { Injectable } from '@nestjs/common';
import { PdfAttachment, PdfReadResult, PdfReader } from '../../domain/extraction/pdf-reader.port';

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
  async read(buffer: Buffer): Promise<PdfReadResult> {
    const pdfjsLib = await loadPdfJs();

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      verbosity: 0,
    });
    const document = await loadingTask.promise;

    const text = await this.readText(document);
    const attachments = await this.readAttachments(document);

    return { text, attachments, pageCount: document.numPages };
  }

  private async readText(document: PdfJsDocument): Promise<string> {
    let text = '';

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();

      let line = '';
      for (const item of content.items) {
        line += item.str;
        if (item.hasEOL) {
          text += `${line}\n`;
          line = '';
        }
      }
      if (line.length > 0) {
        text += `${line}\n`;
      }
    }

    return text;
  }

  private async readAttachments(document: PdfJsDocument): Promise<PdfAttachment[]> {
    const rawAttachments = await document.getAttachments();

    if (!rawAttachments) {
      return [];
    }

    return Object.values(rawAttachments).map((attachment) => ({
      filename: attachment.filename,
      content: Buffer.from(attachment.content),
    }));
  }
}
