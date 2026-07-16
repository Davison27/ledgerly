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
 *
 * Keyed by the issuer's (normalised) printed name rather than their tax id:
 * the heuristic extraction routinely picks up the *client*'s CIF/NIF (the
 * ERP tenant, identical across every invoice) instead of the supplier's,
 * which would collapse every issuer's hints under a single key.
 */
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
