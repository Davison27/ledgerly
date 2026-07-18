import { InvoiceFields } from '../invoice-fields';
import { ExtractionOutcomeConfidence } from './extraction-outcome';

/**
 * Mirrors the private `computeHeuristicConfidence` in `ExtractInvoiceUseCase`
 * (`application/extract-invoice/extract-invoice.use-case.ts`). Kept as an
 * independent, additive copy here — rather than exporting/reusing the
 * original — so that file, which drives the live extraction path, never has
 * to be touched to support outcome recording.
 */
export function computeHeuristicConfidence(fields: InvoiceFields): ExtractionOutcomeConfidence {
  const hasSupportingField = fields.issuerTaxId != null || fields.invoiceNumber != null || fields.date != null;

  return fields.amount != null && hasSupportingField ? 'partial' : 'low';
}
