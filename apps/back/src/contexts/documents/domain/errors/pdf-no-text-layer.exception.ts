import { DomainException } from '../../../../shared/domain/domain.exception';

/**
 * Raised when a PDF has no embedded structured e-invoice XML and no usable
 * text layer (e.g. a scanned/image-only PDF), so no extraction strategy is
 * available without OCR.
 */
export class PdfNoTextLayerException extends DomainException {
  readonly code = 'PDF_NO_TEXT_LAYER';

  constructor() {
    super('PDF_NO_TEXT_LAYER');
  }
}
