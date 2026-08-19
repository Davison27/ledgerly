export type DocumentTypeDto = 'factura' | 'nomina' | 'impuesto';
export type DocumentStatusDto = 'pagado' | 'pendiente' | 'vencido';
export type DocumentDirectionDto = 'ingreso' | 'gasto';

export interface DocumentDto {
  id: string;
  projectId: string;
  name: string;
  type: DocumentTypeDto;
  direction: DocumentDirectionDto;
  month: number;
  date: string;
  amount: number;
  status: DocumentStatusDto;
  rawStatus: DocumentStatusDto;
  issuerName?: string | null;
  issuerTaxId?: string | null;
  invoiceNumber?: string | null;
  dueDate?: string | null;
  taxBase?: number | null;
  taxRate?: number | null;
  taxAmount?: number | null;
  irpfRate?: number | null;
  irpfAmount?: number | null;
  currency?: string | null;
  hasFile?: boolean;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  supplierId?: string | null;
  staffMemberId?: string | null;
}

export interface DocumentFiltersDto {
  search?: string;
  type?: DocumentTypeDto;
  status?: DocumentStatusDto;
  direction?: DocumentDirectionDto;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
}

export interface DocumentListItemDto {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  type: DocumentTypeDto;
  direction: DocumentDirectionDto;
  status: DocumentStatusDto;
  rawStatus: DocumentStatusDto;
  date: string;
  dueDate: string | null;
  amount: number;
  currency: string;
  issuerName: string | null;
  invoiceNumber: string | null;
  supplierId: string | null;
  staffMemberId: string | null;
}

export interface DocumentListFiltersDto {
  search?: string;
  type?: DocumentTypeDto;
  status?: DocumentStatusDto;
  direction?: DocumentDirectionDto;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  projectId?: string;
  supplierId?: string;
  staffMemberId?: string;
}

export interface DocumentPageParams {
  page: number;
  size: number;
}

export interface DocumentDuplicatePageDto {
  items: DocumentDuplicateDto[];
  total: number;
  page: number;
  size: number;
}

export interface DocumentDuplicateDto {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  date: string;
  amount: number;
}

export interface DuplicateCheckParams {
  issuerName?: string;
  issuerTaxId?: string;
  invoiceNumber: string;
  amount: number;
}

export interface DuplicateCheckResultDto {
  matches: DocumentDuplicateDto[];
}

export interface CreateDocumentPayload {
  name: string;
  type: DocumentTypeDto;
  direction: DocumentDirectionDto;
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
  irpfRate?: number;
  irpfAmount?: number;
  currency?: string;
  supplierId?: string;
  staffMemberId?: string;
}

export interface UpdateDocumentPayload {
  name?: string;
  type?: DocumentTypeDto;
  direction?: DocumentDirectionDto;
  status?: DocumentStatusDto;
  date?: string;
  dueDate?: string | null;
  amount?: number;
  taxBase?: number | null;
  taxRate?: number | null;
  taxAmount?: number | null;
  irpfRate?: number | null;
  irpfAmount?: number | null;
  currency?: string;
  issuerName?: string | null;
  issuerTaxId?: string | null;
  invoiceNumber?: string | null;
  supplierId?: string | null;
  staffMemberId?: string | null;
}

export type ExtractInvoiceSource = 'facturae' | 'facturx' | 'ubl' | 'heuristic';
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
  irpfRate?: number;
  irpfAmount?: number;
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
