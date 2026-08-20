export interface UpdateCompanyDocumentCommand {
  id: string;
  name?: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
}
