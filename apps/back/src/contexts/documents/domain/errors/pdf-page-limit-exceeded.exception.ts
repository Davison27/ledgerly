import { DomainException } from '../../../../shared/domain/domain.exception';

export class PdfPageLimitExceededException extends DomainException {
  readonly code = 'PDF_PAGE_LIMIT_EXCEEDED';

  constructor(readonly pageCount: number, readonly limit: number) {
    super(`PDF exceeds the configured maximum of ${limit} pages`);
  }
}
