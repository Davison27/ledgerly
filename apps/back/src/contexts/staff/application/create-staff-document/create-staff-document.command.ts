export interface CreateStaffDocumentCommand {
  staffMemberId: string;
  typeId: string;
  name: string;
  issueDate: string;
  expiryDate?: string | null;
  notes?: string | null;
  file: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    size: number;
  };
}
