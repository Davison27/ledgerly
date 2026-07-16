/**
 * Invoice fields learnable via per-issuer extraction hints. `name` is
 * excluded because it is always derived from `issuerName`/`invoiceNumber`,
 * and `currency` because its detection is already trivial (symbol/ISO code
 * matching), so there is nothing worth "learning" for either.
 */
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

/**
 * How a hint locates its field's value in the document's text layer:
 * - `inline`: the value follows a text label on the same line
 *   (e.g. "Fecha: 15/03/2026").
 * - `preceding-line`: the value sits alone on its own line, `lineOffset`
 *   lines below the nearest preceding line that carries a text label
 *   (e.g. a table column header above a column of values).
 */
export type HintAnchorKind = 'inline' | 'preceding-line';

/**
 * A learned anchor for locating one field's value in future invoices from
 * the same issuer. The anchor is always a textual position (a label and an
 * offset), never the corrected value itself, so it generalises across
 * invoices whose amounts/dates/numbers differ but whose layout repeats.
 */
export interface InvoiceHint {
  id: string;
  issuerTaxId: string;
  field: LearnableField;
  anchorKind: HintAnchorKind;
  anchorLabel: string;
  lineOffset: number;
  sampleValue: string;
  occurrences: number;
}
