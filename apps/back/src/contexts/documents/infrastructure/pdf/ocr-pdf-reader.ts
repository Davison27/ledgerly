import { Injectable, Logger } from '@nestjs/common';
import { PdfReadResult, PdfReader } from '../../domain/extraction/pdf-reader.port';
import { tryParseStructuredInvoice } from '../../domain/extraction/structured-invoice';
import { LocalPdfOcr } from './local-pdf-ocr';
import { PdfjsPdfReader } from './pdfjs-pdf-reader';

@Injectable()
export class OcrPdfReader implements PdfReader {
  private readonly logger = new Logger(OcrPdfReader.name);

  constructor(
    private readonly pdfjsReader: PdfjsPdfReader,
    private readonly localPdfOcr: LocalPdfOcr,
  ) {}

  async read(buffer: Buffer): Promise<PdfReadResult> {
    const initial = await this.pdfjsReader.read(buffer);
    if (initial.text.trim().length > 0 || tryParseStructuredInvoice(initial.attachments) || !this.localPdfOcr.isEnabled()) {
      return initial;
    }

    if (initial.pageCount != null && initial.pageCount > this.localPdfOcr.getMaxPages()) {
      this.logger.warn(`Skipped OCR for ${initial.pageCount}-page PDF because it exceeds the configured page limit`);
      return initial;
    }

    try {
      const ocrPdf = await this.localPdfOcr.run(buffer);
      const ocrResult = await this.pdfjsReader.read(ocrPdf);

      if (ocrResult.text.trim().length === 0) {
        this.logger.warn('Local OCR completed without extracting any text');
        return initial;
      }

      return { ...ocrResult, attachments: initial.attachments, ocrApplied: true };
    } catch (error) {
      this.logger.warn(`Local OCR failed: ${error instanceof Error ? error.message : String(error)}`);
      return initial;
    }
  }
}
