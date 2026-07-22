import { DomainException } from '../../../../shared/domain/domain.exception';

export class PdfNoTextLayerException extends DomainException {
  readonly code = 'PDF_NO_TEXT_LAYER';

  constructor() {
    super('PDF_NO_TEXT_LAYER');
  }
}
