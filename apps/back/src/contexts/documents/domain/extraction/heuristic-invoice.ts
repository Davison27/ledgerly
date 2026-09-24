import { InvoiceFields } from './invoice-fields';
import { extractInvoiceHeuristics } from './invoice-heuristics';
import { applyHints } from './hints/hint-anchor';
import { InvoiceHint } from './hints/invoice-hint';
import { InvoiceHintRepository } from './hints/invoice-hint.repository';
import { normaliseIssuerName } from './issuer-name';
import { canonicalSpanishTaxId } from './tax-id';
import { PdfReadResult } from './pdf-reader.port';
import { KnownPartyDirectory } from './known-party-directory.port';
import { amountsReconcile, computeHeuristicConfidence } from './quality/heuristic-confidence';
import { ExtractionOutcomeConfidence } from './quality/extraction-outcome';
import type { ExtractionWarningCode } from './extraction-warning-code';

export interface HeuristicInvoice {
  fields: InvoiceFields;
  warnings: ExtractionWarningCode[];
  confidence: ExtractionOutcomeConfidence;
}

async function findMatchingHints(
  hints: InvoiceHintRepository,
  issuerTaxId: string | undefined,
  issuerName: string | undefined,
): Promise<InvoiceHint[]> {
  if (issuerTaxId) {
    const byTaxId = await hints.findByIssuerTaxId(issuerTaxId);
    if (byTaxId.length > 0) return byTaxId;
  }

  if (issuerName && issuerName.trim().length > 0) {
    return hints.findByIssuer(normaliseIssuerName(issuerName));
  }

  return [];
}

function syncAmountsInconsistentWarning(
  warnings: ExtractionWarningCode[],
  fields: InvoiceFields,
): ExtractionWarningCode[] {
  const withoutFlag = warnings.filter((warning) => warning !== 'amounts_inconsistent');
  return amountsReconcile(fields) ? withoutFlag : [...withoutFlag, 'amounts_inconsistent'];
}

export async function extractHeuristicInvoice(
  read: PdfReadResult,
  hints: InvoiceHintRepository,
  parties: KnownPartyDirectory,
  issuerKey?: { name?: string; taxId?: string },
): Promise<HeuristicInvoice> {
  const companyTaxId = await parties.findCompanyTaxId();
  const excludedTaxIds = companyTaxId ? [companyTaxId] : [];

  const { fields, warnings } = extractInvoiceHeuristics(read.lines ?? read.text, { excludedTaxIds });

  let resolvedFields = fields;
  let supplierMatched = false;
  if (fields.issuerTaxId) {
    const supplier = await parties.findActiveSupplierByTaxId(canonicalSpanishTaxId(fields.issuerTaxId));
    if (supplier) {
      resolvedFields = { ...resolvedFields, issuerName: supplier.name, issuerTaxId: supplier.taxId };
      supplierMatched = true;
    }
  }

  const issuerTaxIdKey = issuerKey?.taxId
    ? canonicalSpanishTaxId(issuerKey.taxId)
    : resolvedFields.issuerTaxId
      ? canonicalSpanishTaxId(resolvedFields.issuerTaxId)
      : undefined;
  const issuerName = issuerKey?.name ?? resolvedFields.issuerName;

  const matchingHints = await findMatchingHints(hints, issuerTaxIdKey, issuerName);
  const hintsToApply = supplierMatched
    ? matchingHints.filter((hint) => hint.field !== 'issuerName' && hint.field !== 'issuerTaxId')
    : matchingHints;
  const improvedFields = hintsToApply.length > 0 ? applyHints(resolvedFields, hintsToApply, read.text) : resolvedFields;

  const finalWarnings = syncAmountsInconsistentWarning(warnings, improvedFields);

  return { fields: improvedFields, warnings: finalWarnings, confidence: computeHeuristicConfidence(improvedFields) };
}
