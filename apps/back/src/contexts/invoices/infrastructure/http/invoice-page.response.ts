import { Page } from '../../../../shared/domain/pagination';
import { InvoiceListItem } from '../../application/list-invoices/invoice-list-item';
import { InvoiceListItemResponse } from './invoice-list-item.response';

export class InvoicePageResponse {
  items: InvoiceListItemResponse[];
  total: number;
  page: number;
  size: number;

  static fromPage(page: Page<InvoiceListItem>): InvoicePageResponse {
    const response = new InvoicePageResponse();
    response.items = page.items.map((item) => InvoiceListItemResponse.fromItem(item));
    response.total = page.total;
    response.page = page.page;
    response.size = page.size;
    return response;
  }
}
