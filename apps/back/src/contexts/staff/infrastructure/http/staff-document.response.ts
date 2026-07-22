import { StaffDocument } from '../../domain/staff-document';

export class StaffDocumentResponse {
  id: string;
  staffMemberId: string;
  typeId: string;
  name: string;
  issueDate: string;
  expiryDate: string | null;
  notes: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;

  static fromDomain(staffDocument: StaffDocument): StaffDocumentResponse {
    const response = new StaffDocumentResponse();

    response.id = staffDocument.getId();
    response.staffMemberId = staffDocument.getStaffMemberId();
    response.typeId = staffDocument.getTypeId();
    response.name = staffDocument.getName();
    response.issueDate = staffDocument.getIssueDate();
    response.expiryDate = staffDocument.getExpiryDate();
    response.notes = staffDocument.getNotes();
    response.fileName = staffDocument.getFileName();
    response.mimeType = staffDocument.getMimeType();
    response.fileSize = staffDocument.getFileSize();

    return response;
  }
}
