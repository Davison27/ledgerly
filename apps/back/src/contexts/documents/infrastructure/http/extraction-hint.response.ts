import { HintAnchorKind, InvoiceHint, LearnableField } from '../../domain/extraction/hints/invoice-hint';

export class ExtractionHintResponse {
  id: string;
  issuerName: string;
  field: LearnableField;
  anchorKind: HintAnchorKind;
  anchorLabel: string;
  lineOffset: number;
  sampleValue: string;
  occurrences: number;

  static fromDomain(hint: InvoiceHint): ExtractionHintResponse {
    const response = new ExtractionHintResponse();

    response.id = hint.id;
    response.issuerName = hint.issuerName;
    response.field = hint.field;
    response.anchorKind = hint.anchorKind;
    response.anchorLabel = hint.anchorLabel;
    response.lineOffset = hint.lineOffset;
    response.sampleValue = hint.sampleValue;
    response.occurrences = hint.occurrences;

    return response;
  }
}
