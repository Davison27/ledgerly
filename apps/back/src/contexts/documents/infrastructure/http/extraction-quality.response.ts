import {
  ExtractionOutcomeConfidence,
  ExtractionOutcomeSource,
} from '../../domain/extraction/quality/extraction-outcome';
import { ExtractionQualityReport } from '../../application/get-extraction-quality/extraction-quality-report';

export class ExtractionQualityHintResponse {
  issuerName: string;
  field: string;
  occurrences: number;
}

export class ExtractionQualityResponse {
  totalExtractions: number;
  bySource: Record<ExtractionOutcomeSource, number>;
  byConfidence: Record<ExtractionOutcomeConfidence, number>;
  avgCorrectedFields: number;
  correctionRate: number;
  topHints: ExtractionQualityHintResponse[];

  static fromDomain(report: ExtractionQualityReport): ExtractionQualityResponse {
    const response = new ExtractionQualityResponse();

    response.totalExtractions = report.totalExtractions;
    response.bySource = report.bySource;
    response.byConfidence = report.byConfidence;
    response.avgCorrectedFields = report.avgCorrectedFields;
    response.correctionRate = report.correctionRate;
    response.topHints = report.topHints.map((hint) => ({
      issuerName: hint.issuerName,
      field: hint.field,
      occurrences: hint.occurrences,
    }));

    return response;
  }
}
