export interface CheckDocumentDuplicateQuery {
  issuerName?: string | null;
  issuerTaxId?: string | null;
  invoiceNumber: string;
  amount: number;
}
