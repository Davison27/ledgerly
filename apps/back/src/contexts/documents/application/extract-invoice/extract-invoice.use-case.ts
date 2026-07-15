import { Inject, Injectable } from '@nestjs/common';
import { PDF_READER, PdfAttachment, PdfReader } from '../../domain/extraction/pdf-reader.port';
import { InvoiceFields } from '../../domain/extraction/invoice-fields';
import { parseFacturae } from '../../domain/extraction/facturae-parser';
import { parseFacturx } from '../../domain/extraction/facturx-parser';
import { extractInvoiceHeuristics } from '../../domain/extraction/invoice-heuristics';
import { PdfNoTextLayerException } from '../../domain/errors/pdf-no-text-layer.exception';
import { ExtractedInvoiceResult, ExtractionConfidence, ExtractionSource } from './extracted-invoice';

const XML_ATTACHMENT_PATTERN = /\.xml$/i;

function isXmlAttachment(attachment: PdfAttachment): boolean {
  return (
    XML_ATTACHMENT_PATTERN.test(attachment.filename) ||
    attachment.content.subarray(0, 100).toString('utf-8').trimStart().startsWith('<?xml')
  );
}

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
  constructor(@Inject(PDF_READER) private readonly pdfReader: PdfReader) {}

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

    return buildResult('heuristic', computeHeuristicConfidence(fields), fields, warnings);
  }

  private tryStructuredExtraction(attachments: PdfAttachment[]): ExtractedInvoiceResult | null {
    for (const attachment of attachments.filter(isXmlAttachment)) {
      const xml = attachment.content.toString('utf-8');

      const facturaeFields = parseFacturae(xml);
      if (facturaeFields) {
        return buildResult('facturae', 'high', facturaeFields, []);
      }

      const facturxFields = parseFacturx(xml);
      if (facturxFields) {
        return buildResult('facturx', 'high', facturxFields, []);
      }
    }

    return null;
  }
}
