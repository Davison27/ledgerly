export interface DocumentDuplicateCriteria {
  issuerName?: string | null;
  issuerTaxId?: string | null;
  invoiceNumber: string;
  amount: number;
}
