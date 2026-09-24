# Invoice extraction

Invoice extraction lives in `apps/back/src/contexts/documents/`. It runs
entirely in-process with `pdfjs-dist`: there is no OCR, no LLM, and no external
service. Input is always a digital PDF with a text layer; a PDF without one is
rejected with `PDF_NO_TEXT_LAYER` and completed manually.

## Pipeline

1. `PdfjsPdfReader` reads text and embedded attachments once.
2. An embedded Facturae, Factur-X, or UBL XML attachment wins and is returned
   with `high` confidence (`domain/extraction/structured-invoice.ts`).
3. Otherwise `extractHeuristicInvoice` (`domain/extraction/heuristic-invoice.ts`)
   runs the text heuristics, applies known parties and learned hints, and
   computes confidence. `ExtractInvoiceUseCase`,
   `RecordExtractionFeedbackUseCase`, and `RecordExtractionOutcomeUseCase` all
   call this one function so learning and quality metrics see exactly what the
   user was shown.

## Layout-aware reading

PDF content-stream order is not visual order, and gluing items produced wrong
values such as a date concatenated with an amount. `buildPageLines`
(`infrastructure/pdf/pdf-text-layout.ts`) uses each item's coordinates: items
are grouped into visual lines by `y` (tolerance relative to font height),
sorted by `x`, and split into cells when the horizontal gap is large.
`PdfReadResult.lines` exposes page, line, and cell geometry; `text` joins cells
with `\t` and lines with `\n` for hint anchoring.

## Heuristics

`extractInvoiceHeuristics` (`domain/extraction/invoice-heuristics.ts`) works on
cells, not raw lines:

- A value is paired with its label in the same cell, in a cell to its right, or
  up to two lines below in the same column. The below lookup needs real
  geometry, so plain-text input only pairs on the same row.
- Total labels have three priorities (`TOTAL_LABEL_P3` payable total, `P2`
  invoice total, `P1` bare total excluding gross/base/VAT subtotals). The
  highest priority wins; ties take the last in reading order. There is no
  "largest amount" fallback: an empty total with `missing_total_amount` is
  preferred to a wrong one.
- Amounts must look like money (decimal separator, or an integer marked with a
  currency), so quantities, years, and postcodes are ignored.
- Tax IDs come from `findSpanishTaxIds` (`domain/extraction/tax-id.ts`):
  every match per cell, optional `ES` prefix, and NIF/NIE/K-L-M/CIF checksum
  validation. Checksum-valid IDs are preferred; an invalid but well-formed ID
  is only a fallback and can never produce `high` confidence.
- The client block is the customer-label cell plus the cells in its column
  over the next lines, so a two-column header separates issuer and client.

## Amount reconciliation and confidence

`reconcileAmounts` (`domain/extraction/amount-reconciliation.ts`) picks the
base, VAT, withholding, and total candidates whose arithmetic holds
(base + VAT − withholding = total, tolerance 0.02). With several VAT rates the
result returns the summed base and VAT, leaves `taxRate` empty, and warns
`multiple_tax_rates`. When no labelled total exists, a total is only derived if
the reconciled value is printed in the document. Figures that do not reconcile
add `amounts_inconsistent`.

`computeHeuristicConfidence` (`domain/extraction/quality/heuristic-confidence.ts`)
returns `high` only when the amounts reconcile, the issuer tax ID passes its
checksum, and the invoice number and date are present; `low` when base and VAT
exist but do not reconcile, or when there is no total; `partial` otherwise if
a tax ID, invoice number, or date supports the total. Warnings are re-synced after
hints so they never contradict the confidence.

## Known parties and learned hints

The `KnownPartyDirectory` port (`domain/extraction/known-party-directory.port.ts`,
adapter `TypeOrmKnownPartyDirectory`) reads the singleton company's tax ID and
active supplier tax IDs:

- The company's own tax ID is never returned as the issuer; the counterparty
  fills the issuer fields.
- A supplier matched by tax ID (with or without `ES` prefix) supplies its stored
  name and tax ID, which learned hints cannot override.

Learned hints are keyed by issuer tax ID when known, with the normalized issuer
name as fallback (`invoice_extraction_hints.issuer_tax_id`, partial unique
index with `field`). A later correction without a tax ID keeps the tax ID
already learned for that hint.

## Accuracy gate

`application/extract-invoice/__fixtures__/invoice-corpus/` holds synthetic
invoices (layout plus ground truth), rendered in memory by
`infrastructure/pdf/__fixtures__/minimal-pdf-writer.ts`. They cover
single-column, two-column headers, content-stream order different from visual
order, tables, withholding, multi-rate VAT, `ES`-prefixed IDs, the company as
client, known suppliers, and multi-page invoices. `extract-invoice.corpus.spec.ts`
reports per-field accuracy and the count of confidently wrong totals, and fails
when any value falls below `baseline.json`. Raise the baseline when accuracy
improves; never lower it. Add a fixture for every new layout family or bug.
