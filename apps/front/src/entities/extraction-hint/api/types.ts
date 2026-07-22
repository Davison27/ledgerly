export type ExtractInvoiceSource = 'facturae' | 'facturx' | 'ubl' | 'heuristic';
export type ExtractInvoiceConfidence = 'high' | 'partial' | 'low';

export type ExtractionHintField =
  | 'issuerName'
  | 'issuerTaxId'
  | 'invoiceNumber'
  | 'date'
  | 'dueDate'
  | 'amount'
  | 'taxBase'
  | 'taxRate'
  | 'taxAmount';

export type ExtractionHintAnchorKind = 'inline' | 'preceding-line';

export interface ExtractionHintDto {
  id: string;
  issuerName: string;
  field: ExtractionHintField;
  anchorKind: ExtractionHintAnchorKind;
  anchorLabel: string;
  lineOffset: number;
  sampleValue: string;
  occurrences: number;
}

export interface ExtractionQualityTopHintDto {
  issuerName: string;
  field: ExtractionHintField;
  occurrences: number;
}

export interface ExtractionQualityDto {
  totalExtractions: number;
  bySource: Record<ExtractInvoiceSource, number>;
  byConfidence: Record<ExtractInvoiceConfidence, number>;
  avgCorrectedFields: number;
  correctionRate: number;
  topHints: ExtractionQualityTopHintDto[];
}
