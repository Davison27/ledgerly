import { EquipmentDocument } from '../../domain/equipment-document';

export class EquipmentDocumentResponse {
  id: string;
  equipmentId: string;
  name: string;
  issueDate: string | null;
  expiryDate: string | null;
  notes: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;

  static fromDomain(document: EquipmentDocument): EquipmentDocumentResponse {
    const response = new EquipmentDocumentResponse();

    response.id = document.getId();
    response.equipmentId = document.getEquipmentId();
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
