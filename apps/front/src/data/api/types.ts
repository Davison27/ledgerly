export type DocumentTypeDto = 'factura' | 'nomina' | 'impuesto';
export type DocumentStatusDto = 'pagado' | 'pendiente' | 'vencido';

export type ProjectTypeDto =
  | 'client'
  | 'internal'
  | 'audiovisual'
  | 'construction'
  | 'consulting'
  | 'other';

export type ProjectStatusDto = 'active' | 'on_hold' | 'completed' | 'archived';

export type ProjectCurrencyDto = 'EUR' | 'USD' | 'GBP';

export interface ProjectSummaryDto {
  id: string;
  name: string;
  code: string;
  documentCount: number;
  pendingCount: number;
}

export interface ProjectDto {
  id: string;
  name: string;
  code: string;
  type: ProjectTypeDto;
  status: ProjectStatusDto;
  description?: string | null;
  clientCompany?: string | null;
  clientTaxId?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  budget?: number | null;
  currency?: ProjectCurrencyDto | null;
  fiscalYear?: string | null;
  manager?: string | null;
}

export interface CreateProjectPayload {
  name: string;
  code: string;
  type: ProjectTypeDto;
  status?: ProjectStatusDto;
  description?: string;
  clientCompany?: string;
  clientTaxId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  currency?: ProjectCurrencyDto;
  fiscalYear?: string;
  manager?: string;
}

export interface CompanyDto {
  id: string;
  name: string;
  legalName?: string | null;
  taxId?: string | null;
  sector?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  logo?: string | null;
}

export interface UpdateCompanyPayload {
  name?: string;
  legalName?: string;
  taxId?: string;
  sector?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  logo?: string;
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

export type ExtractionHintField =
  | 'issuerName'
  | 'issuerTaxId'
  | 'invoiceNumber'
  | 'date'
  | 'dueDate'
  | 'amount'
  | 'taxBase'
  | 'taxRate'
  | 'taxAmount';

export type ExtractionHintAnchorKind = 'inline' | 'preceding-line';

export interface ExtractionHintDto {
  id: string;
  issuerName: string;
  field: ExtractionHintField;
  anchorKind: ExtractionHintAnchorKind;
  anchorLabel: string;
  lineOffset: number;
  sampleValue: string;
  occurrences: number;
}
