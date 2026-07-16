import { HintAnchorKind, InvoiceHint, LearnableField } from '../../domain/extraction/hints/invoice-hint';
import { InvoiceExtractionHintOrmEntity } from './invoice-extraction-hint.orm-entity';

export class InvoiceExtractionHintMapper {
  static toDomain(orm: InvoiceExtractionHintOrmEntity): InvoiceHint {
    return {
      id: orm.id,
      issuerName: orm.issuerName,
      field: orm.field as LearnableField,
      anchorKind: orm.anchorKind as HintAnchorKind,
      anchorLabel: orm.anchorLabel,
      lineOffset: orm.lineOffset,
      sampleValue: orm.sampleValue,
      occurrences: orm.occurrences,
    };
  }
}
