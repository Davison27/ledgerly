import { CompanyDocument } from '../../domain/company-document';

export class CompanyDocumentResponse {
  id: string;
  typeId: string;
  name: string;
  issueDate: string | null;
  expiryDate: string | null;
  notes: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;

  static fromDomain(document: CompanyDocument): CompanyDocumentResponse {
    const response = new CompanyDocumentResponse();

    response.id = document.getId();
    response.typeId = document.getTypeId();
    response.name = document.getName();
    response.issueDate = document.getIssueDate();
    response.expiryDate = document.getExpiryDate();
    response.notes = document.getNotes();
    response.fileName = document.getFileName();
    response.mimeType = document.getMimeType();
    response.fileSize = document.getFileSize();

    return response;
  }
}
