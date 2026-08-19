import { Page } from '../../../../shared/domain/pagination';
import { DocumentListItem } from '../../application/list-all-documents/document-list-item';
import { DocumentListItemResponse } from './document-list-item.response';

export class DocumentListPageResponse {
  items: DocumentListItemResponse[];
  total: number;
  page: number;
  size: number;

  static fromPage(page: Page<DocumentListItem>): DocumentListPageResponse {
    const response = new DocumentListPageResponse();
    response.items = page.items.map((item) => DocumentListItemResponse.fromResult(item));
    response.total = page.total;
    response.page = page.page;
    response.size = page.size;
    return response;
  }
}
