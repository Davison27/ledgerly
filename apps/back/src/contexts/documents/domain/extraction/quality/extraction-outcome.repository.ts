import { ExtractionQualityStats, NewExtractionOutcome } from './extraction-outcome';

export const EXTRACTION_OUTCOME_REPOSITORY = Symbol('ExtractionOutcomeRepository');

export interface ExtractionOutcomeRepository {
  save(outcome: NewExtractionOutcome): Promise<void>;
  aggregate(): Promise<ExtractionQualityStats>;
}
