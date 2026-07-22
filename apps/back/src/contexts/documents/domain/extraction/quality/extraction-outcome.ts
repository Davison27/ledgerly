export type ExtractionOutcomeSource = 'facturae' | 'facturx' | 'ubl' | 'heuristic';

export type ExtractionOutcomeConfidence = 'high' | 'partial' | 'low';

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

export interface ExtractionQualityStats {
  totalExtractions: number;
  bySource: Record<ExtractionOutcomeSource, number>;
  byConfidence: Record<ExtractionOutcomeConfidence, number>;
  avgCorrectedFields: number;
  correctionRate: number;
}
