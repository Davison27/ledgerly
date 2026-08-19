export interface UpdateStaffDocumentCommand {
  id: string;
  staffMemberId?: string;
  name?: string;
  issueDate?: string;
  expiryDate?: string | null;
  notes?: string | null;
}
