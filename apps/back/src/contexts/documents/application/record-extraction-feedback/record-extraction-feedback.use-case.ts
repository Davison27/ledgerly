import { Inject, Injectable } from '@nestjs/common';
import { PDF_READER, PdfReader } from '../../domain/extraction/pdf-reader.port';
import { tryParseStructuredInvoice } from '../../domain/extraction/structured-invoice';
import { extractHeuristicInvoice } from '../../domain/extraction/heuristic-invoice';
import { deriveHint } from '../../domain/extraction/hints/hint-anchor';
import { LEARNABLE_FIELDS, LearnableField } from '../../domain/extraction/hints/invoice-hint';
import { INVOICE_HINT_REPOSITORY, InvoiceHintRepository } from '../../domain/extraction/hints/invoice-hint.repository';
import { KNOWN_PARTY_DIRECTORY, KnownPartyDirectory } from '../../domain/extraction/known-party-directory.port';
import { canonicalSpanishTaxId, normaliseTaxId } from '../../domain/extraction/tax-id';
import { normaliseIssuerName } from '../../domain/extraction/issuer-name';
import { RecordExtractionFeedbackCommand } from './record-extraction-feedback.command';

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

@Injectable()
export class RecordExtractionFeedbackUseCase {
  constructor(
    @Inject(PDF_READER) private readonly pdfReader: PdfReader,
    @Inject(INVOICE_HINT_REPOSITORY) private readonly hintRepository: InvoiceHintRepository,
    @Inject(KNOWN_PARTY_DIRECTORY) private readonly knownPartyDirectory: KnownPartyDirectory,
  ) {}

  async execute(command: RecordExtractionFeedbackCommand): Promise<void> {
    const readResult = await this.pdfReader.read(command.fileBuffer);
    const { text, attachments } = readResult;

    if (tryParseStructuredInvoice(attachments)) {
      return;
    }

    if (text.trim().length === 0) {
      return;
    }

    const { fields: shown } = await extractHeuristicInvoice(readResult, this.hintRepository, this.knownPartyDirectory, {
      name: command.submitted.issuerName,
      taxId: command.submitted.issuerTaxId,
    });

    const issuerName = command.submitted.issuerName ?? shown.issuerName;
    if (!issuerName || issuerName.trim().length === 0) {
      return;
    }
    const key = normaliseIssuerName(issuerName);
    const keyTaxIdSource = command.submitted.issuerTaxId ?? shown.issuerTaxId;
    const keyTaxId = keyTaxIdSource ? canonicalSpanishTaxId(keyTaxIdSource) : undefined;

    for (const field of LEARNABLE_FIELDS) {
      const submittedValue = command.submitted[field];
      if (submittedValue == null) {
        continue;
      }
      if (valuesMatch(field, submittedValue, shown[field])) {
        continue;
      }

      const derived = deriveHint(text, field, submittedValue);
      if (!derived) {
        continue;
      }

      await this.hintRepository.upsert({
        issuerName: key,
        issuerTaxId: keyTaxId,
        field,
        anchorKind: derived.anchorKind,
        anchorLabel: derived.anchorLabel,
        lineOffset: derived.lineOffset,
        sampleValue: derived.sampleValue,
      });
    }
  }
}
