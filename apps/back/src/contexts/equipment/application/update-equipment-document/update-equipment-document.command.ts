export interface UpdateEquipmentDocumentCommand {
  equipmentId: string;
  documentId: string;
  name?: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
}
