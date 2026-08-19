import { DocumentDuplicateMatch } from '../../application/check-document-duplicate/document-duplicate-match';
import { Page } from '../../../../shared/domain/pagination';

export class DocumentDuplicateMatchResponse {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  date: string;
  amount: number;

  static fromResult(match: DocumentDuplicateMatch): DocumentDuplicateMatchResponse {
    const response = new DocumentDuplicateMatchResponse();

    response.id = match.id;
    response.projectId = match.projectId;
    response.projectName = match.projectName;
    response.name = match.name;
    response.date = match.date;
    response.amount = match.amount;

    return response;
  }
}

export class DocumentDuplicateCheckResponse {
  matches: DocumentDuplicateMatchResponse[];
  items: DocumentDuplicateMatchResponse[];
  total: number;
  page: number;
  size: number;

  static fromResults(matches: DocumentDuplicateMatch[]): DocumentDuplicateCheckResponse {
    const response = new DocumentDuplicateCheckResponse();

    response.matches = matches.map((match) => DocumentDuplicateMatchResponse.fromResult(match));

    return response;
  }

  static fromPage(page: Page<DocumentDuplicateMatch>): DocumentDuplicateCheckResponse {
    const response = new DocumentDuplicateCheckResponse();
    response.items = page.items.map((match) => DocumentDuplicateMatchResponse.fromResult(match));
    response.total = page.total;
    response.page = page.page;
    response.size = page.size;
    return response;
  }
}
