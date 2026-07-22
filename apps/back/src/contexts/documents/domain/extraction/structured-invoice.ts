import { parseFacturae } from './facturae-parser';
import { parseFacturx } from './facturx-parser';
import { parseUbl } from './ubl-parser';
import { InvoiceFields } from './invoice-fields';
import { PdfAttachment } from './pdf-reader.port';

const XML_ATTACHMENT_PATTERN = /\.xml$/i;

export function isXmlAttachment(attachment: PdfAttachment): boolean {
  return (
    XML_ATTACHMENT_PATTERN.test(attachment.filename) ||
    attachment.content.subarray(0, 100).toString('utf-8').trimStart().startsWith('<?xml')
  );
}

export type StructuredExtractionSource = 'facturae' | 'facturx' | 'ubl';

export interface StructuredExtraction {
  source: StructuredExtractionSource;
  fields: InvoiceFields;
}

export function tryParseStructuredInvoice(attachments: PdfAttachment[]): StructuredExtraction | null {
  for (const attachment of attachments.filter(isXmlAttachment)) {
    const xml = attachment.content.toString('utf-8');

    const facturaeFields = parseFacturae(xml);
    if (facturaeFields) {
      return { source: 'facturae', fields: facturaeFields };
    }

    const facturxFields = parseFacturx(xml);
    if (facturxFields) {
      return { source: 'facturx', fields: facturxFields };
    }

    const ublFields = parseUbl(xml);
    if (ublFields) {
      return { source: 'ubl', fields: ublFields };
    }
  }

  return null;
}
