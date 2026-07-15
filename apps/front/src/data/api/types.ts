export type DocumentTypeDto = 'factura' | 'nomina' | 'impuesto';
export type DocumentStatusDto = 'pagado' | 'pendiente' | 'vencido';

export interface ProjectSummaryDto {
  id: string;
  name: string;
  code: string;
  documentCount: number;
  pendingCount: number;
}

export interface DocumentDto {
  id: string;
  name: string;
  type: DocumentTypeDto;
  month: number;
  date: string;
  amount: number;
  status: DocumentStatusDto;
  issuerName?: string | null;
  issuerTaxId?: string | null;
  invoiceNumber?: string | null;
  dueDate?: string | null;
  taxBase?: number | null;
  taxRate?: number | null;
  taxAmount?: number | null;
  currency?: string | null;
  hasFile?: boolean;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
}

export interface DocumentFiltersDto {
  search?: string;
  type?: DocumentTypeDto;
  status?: DocumentStatusDto;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
}

export interface CreateDocumentPayload {
  name: string;
  type: DocumentTypeDto;
  month: number;
  date: string;
  amount: number;
  status: DocumentStatusDto;
  issuerName?: string;
  issuerTaxId?: string;
  invoiceNumber?: string;
  dueDate?: string;
  taxBase?: number;
  taxRate?: number;
  taxAmount?: number;
  currency?: string;
}

export type ExtractInvoiceSource = 'facturae' | 'facturx' | 'heuristic';
export type ExtractInvoiceConfidence = 'high' | 'partial' | 'low';

export interface ExtractInvoiceFields {
  name?: string;
  type?: DocumentTypeDto;
  date?: string;
  dueDate?: string;
  amount?: number;
  taxBase?: number;
  taxRate?: number;
  taxAmount?: number;
  currency?: string;
  invoiceNumber?: string;
  issuerName?: string;
  issuerTaxId?: string;
}

export interface ExtractInvoiceResult {
  source: ExtractInvoiceSource;
  confidence: ExtractInvoiceConfidence;
  fields: ExtractInvoiceFields;
  warnings: string[];
}
