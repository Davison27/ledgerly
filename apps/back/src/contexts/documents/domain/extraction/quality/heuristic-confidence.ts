import { InvoiceFields } from '../invoice-fields';
import { isValidSpanishTaxId } from '../tax-id';
import { ExtractionOutcomeConfidence } from './extraction-outcome';

const TOLERANCE = 0.02;

export function amountsReconcile(fields: InvoiceFields): boolean {
  if (fields.amount == null || fields.taxBase == null || fields.taxAmount == null) return true;

  const payable = fields.taxBase + fields.taxAmount - (fields.irpfAmount ?? 0);
  return Math.abs(payable - fields.amount) <= TOLERANCE;
}

export function computeHeuristicConfidence(fields: InvoiceFields): ExtractionOutcomeConfidence {
  if (fields.amount == null) return 'low';

  const hasBaseAndTax = fields.taxBase != null && fields.taxAmount != null;
  if (hasBaseAndTax) {
    if (!amountsReconcile(fields)) return 'low';

    if (
      fields.issuerTaxId != null &&
      isValidSpanishTaxId(fields.issuerTaxId) &&
      fields.invoiceNumber != null &&
      fields.date != null
    ) {
      return 'high';
    }
  }

  const hasSupportingField = fields.issuerTaxId != null || fields.invoiceNumber != null || fields.date != null;
  return hasSupportingField ? 'partial' : 'low';
}
