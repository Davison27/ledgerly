export interface UpdateStaffDocumentCommand {
  id: string;
  name?: string;
  issueDate?: string;
  expiryDate?: string | null;
  notes?: string | null;
}
