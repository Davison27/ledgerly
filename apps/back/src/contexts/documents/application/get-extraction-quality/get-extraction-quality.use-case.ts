import { Inject, Injectable } from '@nestjs/common';
import { INVOICE_HINT_REPOSITORY, InvoiceHintRepository } from '../../domain/extraction/hints/invoice-hint.repository';
import {
  EXTRACTION_OUTCOME_REPOSITORY,
  ExtractionOutcomeRepository,
} from '../../domain/extraction/quality/extraction-outcome.repository';
import { ExtractionQualityReport } from './extraction-quality-report';

const TOP_HINTS_LIMIT = 10;

@Injectable()
export class GetExtractionQualityUseCase {
  constructor(
    @Inject(EXTRACTION_OUTCOME_REPOSITORY) private readonly outcomeRepository: ExtractionOutcomeRepository,
    @Inject(INVOICE_HINT_REPOSITORY) private readonly hintRepository: InvoiceHintRepository,
  ) {}

  async execute(): Promise<ExtractionQualityReport> {
    const [stats, hints] = await Promise.all([this.outcomeRepository.aggregate(), this.hintRepository.findAll()]);

    const topHints = [...hints]
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, TOP_HINTS_LIMIT)
      .map((hint) => ({ issuerName: hint.issuerName, field: hint.field, occurrences: hint.occurrences }));

    return { ...stats, topHints };
  }
}
