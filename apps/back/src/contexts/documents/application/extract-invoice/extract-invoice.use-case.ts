import { Inject, Injectable } from '@nestjs/common';
import { PDF_READER, PdfAttachment, PdfReader } from '../../domain/extraction/pdf-reader.port';
import { InvoiceFields } from '../../domain/extraction/invoice-fields';
import { tryParseStructuredInvoice } from '../../domain/extraction/structured-invoice';
import { extractInvoiceHeuristics } from '../../domain/extraction/invoice-heuristics';
import { applyHints } from '../../domain/extraction/hints/hint-anchor';
import { INVOICE_HINT_REPOSITORY, InvoiceHintRepository } from '../../domain/extraction/hints/invoice-hint.repository';
import { normaliseTaxId } from '../../domain/extraction/tax-id';
import { PdfNoTextLayerException } from '../../domain/errors/pdf-no-text-layer.exception';
import { ExtractedInvoiceResult, ExtractionConfidence, ExtractionSource } from './extracted-invoice';

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
  ) {}

  async execute(pdf: Buffer): Promise<ExtractedInvoiceResult> {
    const { text, attachments } = await this.pdfReader.read(pdf);

    const structuredResult = this.tryStructuredExtraction(attachments);
    if (structuredResult) {
      return structuredResult;
    }

    if (text.trim().length === 0) {
      throw new PdfNoTextLayerException();
    }

    const { fields, warnings } = extractInvoiceHeuristics(text);
    const improvedFields = await this.applyLearnedHints(fields, text);

    return buildResult('heuristic', computeHeuristicConfidence(improvedFields), improvedFields, warnings);
  }

  // Structured (Facturae/Factur-X) extractions never go through here: the
  // per-issuer memory only ever augments the label-driven heuristic path.
  private async applyLearnedHints(fields: InvoiceFields, text: string): Promise<InvoiceFields> {
    if (!fields.issuerTaxId) {
      return fields;
    }

    const hints = await this.hintRepository.findByIssuer(normaliseTaxId(fields.issuerTaxId));
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
