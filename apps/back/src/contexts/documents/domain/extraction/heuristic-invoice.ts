import { InvoiceFields } from './invoice-fields';
import { extractInvoiceHeuristics } from './invoice-heuristics';
import { applyHints } from './hints/hint-anchor';
import { InvoiceHintRepository } from './hints/invoice-hint.repository';
import { normaliseIssuerName } from './issuer-name';
import { PdfReadResult } from './pdf-reader.port';
import { computeHeuristicConfidence } from './quality/heuristic-confidence';
import { ExtractionOutcomeConfidence } from './quality/extraction-outcome';
import type { ExtractionWarningCode } from './extraction-warning-code';

export interface HeuristicInvoice {
  fields: InvoiceFields;
  warnings: ExtractionWarningCode[];
  confidence: ExtractionOutcomeConfidence;
}

async function applyLearnedHints(
  fields: InvoiceFields,
  issuerName: string,
  text: string,
  hints: InvoiceHintRepository,
): Promise<InvoiceFields> {
  const matchingHints = await hints.findByIssuer(normaliseIssuerName(issuerName));
  return matchingHints.length > 0 ? applyHints(fields, matchingHints, text) : fields;
}

export async function extractHeuristicInvoice(
  read: PdfReadResult,
  hints: InvoiceHintRepository,
  issuerKey?: { name?: string },
): Promise<HeuristicInvoice> {
  const { fields, warnings } = extractInvoiceHeuristics(read.lines ?? read.text);

  const issuerName = issuerKey?.name ?? fields.issuerName;
  const improvedFields =
    issuerName && issuerName.trim().length > 0
      ? await applyLearnedHints(fields, issuerName, read.text, hints)
      : fields;

  return { fields: improvedFields, warnings, confidence: computeHeuristicConfidence(improvedFields) };
}
