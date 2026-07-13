import { Document } from '../../domain/document';
import { DocumentType } from '../../domain/document-type';
import { DocumentStatus } from '../../domain/document-status';

export class DocumentResponse {
  id: string;
  name: string;
  type: DocumentType;
  month: number;
  date: string;
  amount: number;
  status: DocumentStatus;

  static fromDomain(document: Document): DocumentResponse {
    const response = new DocumentResponse();

    response.id = document.getId();
    response.name = document.getName();
    response.type = document.getType();
    response.month = document.getMonth();
    response.date = document.getDate();
    response.amount = document.getAmount();
    response.status = document.getStatus();

    return response;
  }
}
