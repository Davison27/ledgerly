/**
 * The sources an invoice's fields can have been extracted from. Mirrors
 * `ExtractionSource` (`application/extract-invoice/extracted-invoice.ts`)
 * but is declared independently here so this domain-level read model never
 * has to depend on the application layer.
 */
export type ExtractionOutcomeSource = 'facturae' | 'facturx' | 'ubl' | 'heuristic';

export type ExtractionOutcomeConfidence = 'high' | 'partial' | 'low';

/**
 * A single recorded outcome of extracting invoice fields from a
 * PDF-backed document at creation time: which strategy produced the
 * fields, how confident that strategy was, and how many of the fields the
 * user ended up correcting by hand. Used purely for quality reporting —
 * never read back into the extraction pipeline itself.
 */
export interface ExtractionOutcome {
  id: string;
  source: ExtractionOutcomeSource;
  confidence: ExtractionOutcomeConfidence;
  correctedFields: number;
  issuerName?: string;
  createdAt: Date;
}

export interface NewExtractionOutcome {
  source: ExtractionOutcomeSource;
  confidence: ExtractionOutcomeConfidence;
  correctedFields: number;
  issuerName?: string;
}

/** Aggregate quality metrics computed across every recorded outcome. */
export interface ExtractionQualityStats {
  totalExtractions: number;
  bySource: Record<ExtractionOutcomeSource, number>;
  byConfidence: Record<ExtractionOutcomeConfidence, number>;
  avgCorrectedFields: number;
  /** Fraction (0..1) of outcomes with at least one corrected field. */
  correctionRate: number;
}
