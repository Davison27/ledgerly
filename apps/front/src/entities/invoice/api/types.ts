export interface InvoiceLineDto {
  description: string;
  unitPrice: number;
  quantity: number;
  productId: string | null;
  amount: number;
}

export interface CreateInvoiceLinePayload {
  description: string;
  unitPrice: number;
  quantity: number;
  productId?: string;
}

export interface InvoiceDto {
  id: string;
  series: string;
  year: number;
  number: number;
  fullNumber: string;
  issueDate: string;
  projectId: string;
  customerName: string;
  customerTaxId: string | null;
  customerAddress: string | null;
  lines: InvoiceLineDto[];
  taxBase: number;
  taxRate: number;
  taxAmount: number;
  irpfRate: number;
  irpfAmount: number;
  total: number;
  currency: string;
  notes: string | null;
  documentId: string | null;
  hasPdf: boolean;
}

export type InvoicePaymentStatusDto = 'pagado' | 'pendiente' | 'vencido';

export interface InvoiceListItemDto extends InvoiceDto {
  paymentStatus: InvoicePaymentStatusDto | null;
}

export interface CreateInvoicePayload {
  projectId: string;
  issueDate?: string;
  lines: CreateInvoiceLinePayload[];
  taxRate?: number;
  irpfRate?: number;
  customerName: string;
  customerTaxId?: string;
  customerAddress?: string;
  notes?: string;
}
