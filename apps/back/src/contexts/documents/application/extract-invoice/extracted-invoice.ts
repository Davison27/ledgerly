import { DocumentType } from '../../domain/document-type';
import { InvoiceFields } from '../../domain/extraction/invoice-fields';

export type ExtractionSource = 'facturae' | 'facturx' | 'ubl' | 'heuristic';
export type ExtractionConfidence = 'high' | 'partial' | 'low';

export interface ExtractedInvoiceFields extends InvoiceFields {
  type?: DocumentType;
}

export interface ExtractedInvoiceResult {
  source: ExtractionSource;
  confidence: ExtractionConfidence;
  fields: ExtractedInvoiceFields;
  warnings: string[];
}
