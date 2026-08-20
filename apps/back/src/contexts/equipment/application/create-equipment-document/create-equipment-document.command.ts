export interface CreateEquipmentDocumentCommand {
  equipmentId: string;
  name: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
  file: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    size: number;
  };
}
