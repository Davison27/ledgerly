import { Page } from '../../../../shared/domain/pagination';
import { Document } from '../../domain/document';
import { DocumentResponse } from './document.response';

export class DocumentPageResponse {
  items: DocumentResponse[];
  total: number;
  page: number;
  size: number;

  static fromPage(page: Page<Document>): DocumentPageResponse {
    const response = new DocumentPageResponse();
    response.items = page.items.map((document) => DocumentResponse.fromDomain(document));
    response.total = page.total;
    response.page = page.page;
    response.size = page.size;
    return response;
  }
}
