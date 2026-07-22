import { Inject, Injectable } from '@nestjs/common';
import { PDF_READER, PdfReader } from '../../domain/extraction/pdf-reader.port';
import { tryParseStructuredInvoice } from '../../domain/extraction/structured-invoice';
import { extractInvoiceHeuristics } from '../../domain/extraction/invoice-heuristics';
import { applyHints } from '../../domain/extraction/hints/hint-anchor';
import { LEARNABLE_FIELDS, LearnableField } from '../../domain/extraction/hints/invoice-hint';
import { INVOICE_HINT_REPOSITORY, InvoiceHintRepository } from '../../domain/extraction/hints/invoice-hint.repository';
import { normaliseIssuerName } from '../../domain/extraction/issuer-name';
import { normaliseTaxId } from '../../domain/extraction/tax-id';
import { InvoiceFields } from '../../domain/extraction/invoice-fields';
import { computeHeuristicConfidence } from '../../domain/extraction/quality/heuristic-confidence';
import {
  ExtractionOutcomeConfidence,
  ExtractionOutcomeSource,
} from '../../domain/extraction/quality/extraction-outcome';
import {
  EXTRACTION_OUTCOME_REPOSITORY,
  ExtractionOutcomeRepository,
} from '../../domain/extraction/quality/extraction-outcome.repository';
import { RecordExtractionOutcomeCommand } from './record-extraction-outcome.command';

function valuesMatch(field: LearnableField, submitted: string | number, shown: string | number | undefined): boolean {
  if (shown == null) {
    return false;
  }
  if (typeof submitted === 'number' || typeof shown === 'number') {
    return Number(submitted) === Number(shown);
  }
  if (field === 'issuerTaxId') {
    return normaliseTaxId(submitted) === normaliseTaxId(shown);
  }
  return submitted.trim().toLowerCase() === shown.trim().toLowerCase();
}

function countCorrectedFields(submitted: InvoiceFields, shown: InvoiceFields): number {
  let count = 0;

  for (const field of LEARNABLE_FIELDS) {
    const submittedValue = submitted[field];
    if (submittedValue == null) {
      continue;
    }
    if (!valuesMatch(field, submittedValue, shown[field])) {
      count += 1;
    }
  }

  return count;
}

@Injectable()
export class RecordExtractionOutcomeUseCase {
  constructor(
    @Inject(PDF_READER) private readonly pdfReader: PdfReader,
    @Inject(INVOICE_HINT_REPOSITORY) private readonly hintRepository: InvoiceHintRepository,
    @Inject(EXTRACTION_OUTCOME_REPOSITORY) private readonly outcomeRepository: ExtractionOutcomeRepository,
  ) {}

  async execute(command: RecordExtractionOutcomeCommand): Promise<void> {
    const { text, attachments } = await this.pdfReader.read(command.fileBuffer);

    const structured = tryParseStructuredInvoice(attachments);
    if (structured) {
      await this.record(structured.source, 'high', command.submitted, structured.fields);
      return;
    }

    if (text.trim().length === 0) {
      return;
    }

    const { fields: base } = extractInvoiceHeuristics(text);
    const shown = await this.applyLearnedHints(base, command.submitted, text);

    await this.record('heuristic', computeHeuristicConfidence(shown), command.submitted, shown);
  }

  private async applyLearnedHints(
    base: InvoiceFields,
    submitted: InvoiceFields,
    text: string,
  ): Promise<InvoiceFields> {
    const issuerName = submitted.issuerName ?? base.issuerName;
    if (!issuerName || issuerName.trim().length === 0) {
      return base;
    }

    const hints = await this.hintRepository.findByIssuer(normaliseIssuerName(issuerName));
    if (hints.length === 0) {
      return base;
    }

    return applyHints(base, hints, text);
  }

  private async record(
    source: ExtractionOutcomeSource,
    confidence: ExtractionOutcomeConfidence,
    submitted: InvoiceFields,
    shown: InvoiceFields,
  ): Promise<void> {
    await this.outcomeRepository.save({
      source,
      confidence,
      correctedFields: countCorrectedFields(submitted, shown),
      issuerName: submitted.issuerName ?? shown.issuerName,
    });
  }
}
