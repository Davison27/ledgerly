import { ExtractionQualityStats } from '../../domain/extraction/quality/extraction-outcome';

export interface ExtractionQualityHint {
  issuerName: string;
  field: string;
  occurrences: number;
}

export interface ExtractionQualityReport extends ExtractionQualityStats {
  topHints: ExtractionQualityHint[];
}
