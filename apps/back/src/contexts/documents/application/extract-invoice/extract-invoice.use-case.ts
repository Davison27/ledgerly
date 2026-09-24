import { Inject, Injectable } from '@nestjs/common';
import { PDF_READER, PdfAttachment, PdfReader } from '../../domain/extraction/pdf-reader.port';
import { InvoiceFields } from '../../domain/extraction/invoice-fields';
import { tryParseStructuredInvoice } from '../../domain/extraction/structured-invoice';
import { extractHeuristicInvoice } from '../../domain/extraction/heuristic-invoice';
import { INVOICE_HINT_REPOSITORY, InvoiceHintRepository } from '../../domain/extraction/hints/invoice-hint.repository';
import { PdfNoTextLayerException } from '../../domain/errors/pdf-no-text-layer.exception';
import {
  DOMAIN_EVENT_PUBLISHER,
  DomainEventPublisher,
} from '../../../../shared/domain/domain-event-publisher.port';
import { InvoiceExtractionFailedEvent } from '../../domain/events/invoice-extraction-failed.event';
import { ExtractedInvoiceResult, ExtractionConfidence, ExtractionSource } from './extracted-invoice';
import { ExtractInvoiceCommand } from './extract-invoice.command';
import type { ExtractionWarningCode } from '../../domain/extraction/extraction-warning-code';

function buildSuggestedName(fields: InvoiceFields): string | undefined {
  const parts = [fields.issuerName, fields.invoiceNumber].filter(
    (part): part is string => !!part && part.trim().length > 0,
  );

  return parts.length > 0 ? parts.join(' - ') : undefined;
}

function buildResult(
  source: ExtractionSource,
  confidence: ExtractionConfidence,
  fields: InvoiceFields,
  warnings: ExtractionWarningCode[],
): ExtractedInvoiceResult {
  const name = buildSuggestedName(fields);

  return {
    source,
    confidence,
    fields: {
      ...fields,
      type: 'invoice',
      ...(name ? { name } : {}),
    },
    warnings,
  };
}

@Injectable()
export class ExtractInvoiceUseCase {
  constructor(
    @Inject(PDF_READER) private readonly pdfReader: PdfReader,
    @Inject(INVOICE_HINT_REPOSITORY) private readonly hintRepository: InvoiceHintRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(command: ExtractInvoiceCommand): Promise<ExtractedInvoiceResult> {
    const readResult = await this.pdfReader.read(command.fileBuffer);
    const { text, attachments } = readResult;

    const structuredResult = this.tryStructuredExtraction(attachments);
    if (structuredResult) {
      return structuredResult;
    }

    if (text.trim().length === 0) {
      await this.eventPublisher.publish([
        new InvoiceExtractionFailedEvent({ fileName: command.fileName, fileSize: command.fileSize }),
      ]);

      throw new PdfNoTextLayerException();
    }

    const { fields, warnings, confidence } = await extractHeuristicInvoice(readResult, this.hintRepository);

    return buildResult('heuristic', confidence, fields, warnings);
  }

  private tryStructuredExtraction(attachments: PdfAttachment[]): ExtractedInvoiceResult | null {
    const structured = tryParseStructuredInvoice(attachments);

    return structured ? buildResult(structured.source, 'high', structured.fields, []) : null;
  }
}
