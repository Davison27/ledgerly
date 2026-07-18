import {
  ExtractionOutcome,
  ExtractionOutcomeConfidence,
  ExtractionOutcomeSource,
} from '../../domain/extraction/quality/extraction-outcome';
import { ExtractionOutcomeOrmEntity } from './extraction-outcome.orm-entity';

export class ExtractionOutcomeMapper {
  static toDomain(orm: ExtractionOutcomeOrmEntity): ExtractionOutcome {
    return {
      id: orm.id,
      source: orm.source as ExtractionOutcomeSource,
      confidence: orm.confidence as ExtractionOutcomeConfidence,
      correctedFields: orm.correctedFields,
      issuerName: orm.issuerName ?? undefined,
      createdAt: orm.createdAt,
    };
  }
}
