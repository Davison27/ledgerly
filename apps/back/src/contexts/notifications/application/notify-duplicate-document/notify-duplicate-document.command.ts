export interface NotifyDuplicateDocumentCommand {
  documentId: string;
  projectId: string;
  documentName: string;
  invoiceNumber: string | null;
  amount: number;
  issuerName: string | null;
  issuerTaxId: string | null;
}
