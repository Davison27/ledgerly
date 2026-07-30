import { Inject, Injectable } from '@nestjs/common';
import { PDF_READER, PdfAttachment, PdfReader } from '../../domain/extraction/pdf-reader.port';
import { InvoiceFields } from '../../domain/extraction/invoice-fields';
import { tryParseStructuredInvoice } from '../../domain/extraction/structured-invoice';
import { extractInvoiceHeuristics } from '../../domain/extraction/invoice-heuristics';
import { applyHints } from '../../domain/extraction/hints/hint-anchor';
import { INVOICE_HINT_REPOSITORY, InvoiceHintRepository } from '../../domain/extraction/hints/invoice-hint.repository';
import { normaliseIssuerName } from '../../domain/extraction/issuer-name';
import { PdfNoTextLayerException } from '../../domain/errors/pdf-no-text-layer.exception';
import {
  DOMAIN_EVENT_PUBLISHER,
  DomainEventPublisher,
} from '../../../../shared/domain/domain-event-publisher.port';
import { InvoiceExtractionFailedEvent } from '../../domain/events/invoice-extraction-failed.event';
import { ExtractedInvoiceResult, ExtractionConfidence, ExtractionSource } from './extracted-invoice';
import { ExtractInvoiceCommand } from './extract-invoice.command';

function buildSuggestedName(fields: InvoiceFields): string | undefined {
  const parts = [fields.issuerName, fields.invoiceNumber].filter(
    (part): part is string => !!part && part.trim().length > 0,
  );

  return parts.length > 0 ? parts.join(' - ') : undefined;
}

function computeHeuristicConfidence(fields: InvoiceFields): ExtractionConfidence {
  const hasSupportingField = fields.issuerTaxId != null || fields.invoiceNumber != null || fields.date != null;

  return fields.amount != null && hasSupportingField ? 'partial' : 'low';
}

function buildResult(
  source: ExtractionSource,
  confidence: ExtractionConfidence,
  fields: InvoiceFields,
  warnings: string[],
): ExtractedInvoiceResult {
  const name = buildSuggestedName(fields);

  return {
    source,
    confidence,
    fields: {
      ...fields,
      type: 'factura',
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

    const { fields, warnings } = extractInvoiceHeuristics(text);
    const improvedFields = await this.applyLearnedHints(fields, text);

    if (readResult.ocrApplied) {
      warnings.push('El texto se ha reconocido mediante OCR local');
    }

    return buildResult('heuristic', computeHeuristicConfidence(improvedFields), improvedFields, warnings);
  }

  private async applyLearnedHints(fields: InvoiceFields, text: string): Promise<InvoiceFields> {
    if (!fields.issuerName || fields.issuerName.trim().length === 0) {
      return fields;
    }

    const hints = await this.hintRepository.findByIssuer(normaliseIssuerName(fields.issuerName));
    if (hints.length === 0) {
      return fields;
    }

    return applyHints(fields, hints, text);
  }

  private tryStructuredExtraction(attachments: PdfAttachment[]): ExtractedInvoiceResult | null {
    const structured = tryParseStructuredInvoice(attachments);

    return structured ? buildResult(structured.source, 'high', structured.fields, []) : null;
  }
}
