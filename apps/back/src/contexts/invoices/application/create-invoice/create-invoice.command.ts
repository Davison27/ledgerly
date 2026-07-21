export interface CreateInvoiceLineCommand {
  description: string;
  unitPrice: number;
}

export interface CreateInvoiceCommand {
  projectId: string;
  issueDate: string;
  lines: CreateInvoiceLineCommand[];
  taxRate?: number;
  irpfRate?: number;
  customerName: string;
  customerTaxId?: string | null;
  customerAddress?: string | null;
  notes?: string | null;
}
