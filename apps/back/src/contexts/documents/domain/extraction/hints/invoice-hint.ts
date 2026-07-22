export const LEARNABLE_FIELDS = [
  'issuerName',
  'issuerTaxId',
  'invoiceNumber',
  'date',
  'dueDate',
  'amount',
  'taxBase',
  'taxRate',
  'taxAmount',
] as const;

export type LearnableField = (typeof LEARNABLE_FIELDS)[number];

export type HintAnchorKind = 'inline' | 'preceding-line';

export interface InvoiceHint {
  id: string;
  issuerName: string;
  field: LearnableField;
  anchorKind: HintAnchorKind;
  anchorLabel: string;
  lineOffset: number;
  sampleValue: string;
  occurrences: number;
}
