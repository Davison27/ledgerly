export interface DocumentDuplicateRow {
  id: string;
  projectId: string;
  name: string;
  date: string;
  amount: number;
  issuerName: string | null;
  issuerTaxId: string | null;
  invoiceNumber: string | null;
}
