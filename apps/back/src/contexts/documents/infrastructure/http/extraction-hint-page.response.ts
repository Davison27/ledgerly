import { Page } from '../../../../shared/domain/pagination';
import { InvoiceHint } from '../../domain/extraction/hints/invoice-hint';
import { ExtractionHintResponse } from './extraction-hint.response';

export class ExtractionHintPageResponse {
  items: ExtractionHintResponse[];
  total: number;
  page: number;
  size: number;

  static fromPage(page: Page<InvoiceHint>): ExtractionHintPageResponse {
    const response = new ExtractionHintPageResponse();
    response.items = page.items.map((hint) => ExtractionHintResponse.fromDomain(hint));
    response.total = page.total;
    response.page = page.page;
    response.size = page.size;
    return response;
  }
}
