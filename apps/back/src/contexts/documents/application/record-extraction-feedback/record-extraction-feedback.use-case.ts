import { Inject, Injectable } from '@nestjs/common';
import { PDF_READER, PdfReader } from '../../domain/extraction/pdf-reader.port';
import { tryParseStructuredInvoice } from '../../domain/extraction/structured-invoice';
import { extractInvoiceHeuristics } from '../../domain/extraction/invoice-heuristics';
import { applyHints, deriveHint } from '../../domain/extraction/hints/hint-anchor';
import { LEARNABLE_FIELDS, LearnableField } from '../../domain/extraction/hints/invoice-hint';
import { INVOICE_HINT_REPOSITORY, InvoiceHintRepository } from '../../domain/extraction/hints/invoice-hint.repository';
import { normaliseTaxId } from '../../domain/extraction/tax-id';
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

/**
 * Learns from a correction the user made when creating a document: for every
 * learnable field the user submitted a value that differs from what the
 * heuristics (base extraction + hints already known for this issuer) would
 * have shown them, derives a fresh textual anchor from the PDF's own text
 * layer and stores/reinforces it. Structured invoices (Facturae/Factur-X)
 * never contribute: their fields are read directly from XML, so a
 * label-position anchor in the PDF text layer wouldn't mean anything for
 * them, and their tag structure gives no genuine learning signal anyway.
 */
@Injectable()
export class RecordExtractionFeedbackUseCase {
  constructor(
    @Inject(PDF_READER) private readonly pdfReader: PdfReader,
    @Inject(INVOICE_HINT_REPOSITORY) private readonly hintRepository: InvoiceHintRepository,
  ) {}

  async execute(command: RecordExtractionFeedbackCommand): Promise<void> {
    const { text, attachments } = await this.pdfReader.read(command.fileBuffer);

    if (tryParseStructuredInvoice(attachments)) {
      return;
    }

    if (text.trim().length === 0) {
      return;
    }

    const { fields: base } = extractInvoiceHeuristics(text);

    const issuerName = command.submitted.issuerName ?? base.issuerName;
    if (!issuerName || issuerName.trim().length === 0) {
      return;
    }
    const key = normaliseIssuerName(issuerName);

    const existingHints = await this.hintRepository.findByIssuer(key);
    const shown = applyHints(base, existingHints, text);

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
        field,
        anchorKind: derived.anchorKind,
        anchorLabel: derived.anchorLabel,
        lineOffset: derived.lineOffset,
        sampleValue: derived.sampleValue,
      });
    }
  }
}
