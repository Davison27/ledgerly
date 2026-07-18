import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';
import {
  ExtractionOutcomeConfidence,
  ExtractionOutcomeSource,
  ExtractionQualityStats,
  NewExtractionOutcome,
} from '../../domain/extraction/quality/extraction-outcome';
import { ExtractionOutcomeRepository } from '../../domain/extraction/quality/extraction-outcome.repository';
import { ExtractionOutcomeMapper } from './extraction-outcome.mapper';
import { ExtractionOutcomeOrmEntity } from './extraction-outcome.orm-entity';

const SOURCES: ExtractionOutcomeSource[] = ['facturae', 'facturx', 'ubl', 'heuristic'];
const CONFIDENCES: ExtractionOutcomeConfidence[] = ['high', 'partial', 'low'];

function emptyStats(): ExtractionQualityStats {
  return {
    totalExtractions: 0,
    bySource: { facturae: 0, facturx: 0, ubl: 0, heuristic: 0 },
    byConfidence: { high: 0, partial: 0, low: 0 },
    avgCorrectedFields: 0,
    correctionRate: 0,
  };
}

@Injectable()
export class TypeOrmExtractionOutcomeRepository implements ExtractionOutcomeRepository {
  constructor(
    @InjectRepository(ExtractionOutcomeOrmEntity)
    private readonly repository: Repository<ExtractionOutcomeOrmEntity>,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async save(outcome: NewExtractionOutcome): Promise<void> {
    const orm = new ExtractionOutcomeOrmEntity();
    orm.id = this.idGenerator.generate();
    orm.source = outcome.source;
    orm.confidence = outcome.confidence;
    orm.correctedFields = outcome.correctedFields;
    orm.issuerName = outcome.issuerName ?? null;
    orm.createdAt = new Date();

    await this.repository.save(orm);
  }

  async aggregate(): Promise<ExtractionQualityStats> {
    const orms = await this.repository.find();
    if (orms.length === 0) {
      return emptyStats();
    }

    const outcomes = orms.map((orm) => ExtractionOutcomeMapper.toDomain(orm));

    const stats = emptyStats();
    stats.totalExtractions = outcomes.length;

    let correctedFieldsSum = 0;
    let correctedCount = 0;

    for (const outcome of outcomes) {
      if (SOURCES.includes(outcome.source)) {
        stats.bySource[outcome.source] += 1;
      }
      if (CONFIDENCES.includes(outcome.confidence)) {
        stats.byConfidence[outcome.confidence] += 1;
      }
      correctedFieldsSum += outcome.correctedFields;
      if (outcome.correctedFields > 0) {
        correctedCount += 1;
      }
    }

    stats.avgCorrectedFields = correctedFieldsSum / outcomes.length;
    stats.correctionRate = correctedCount / outcomes.length;

    return stats;
  }
}
