import { InvoiceFields } from '../invoice-fields';
import { ExtractionOutcomeConfidence } from './extraction-outcome';

export function computeHeuristicConfidence(fields: InvoiceFields): ExtractionOutcomeConfidence {
  const hasSupportingField = fields.issuerTaxId != null || fields.invoiceNumber != null || fields.date != null;

  return fields.amount != null && hasSupportingField ? 'partial' : 'low';
}
