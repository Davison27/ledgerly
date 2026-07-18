import { DocumentDuplicateMatch } from '../../application/check-document-duplicate/document-duplicate-match';

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

  static fromResults(matches: DocumentDuplicateMatch[]): DocumentDuplicateCheckResponse {
    const response = new DocumentDuplicateCheckResponse();

    response.matches = matches.map((match) => DocumentDuplicateMatchResponse.fromResult(match));

    return response;
  }
}
