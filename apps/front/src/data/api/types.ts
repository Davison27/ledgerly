export type DocumentTypeDto = 'factura' | 'nomina' | 'impuesto';
export type DocumentStatusDto = 'pagado' | 'pendiente' | 'vencido';
export type DocumentDirectionDto = 'ingreso' | 'gasto';

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
  image?: string | null;
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
  image?: string | null;
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
  image?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  code?: string;
  type?: ProjectTypeDto;
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
  image?: string;
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
  projectId: string;
  name: string;
  type: DocumentTypeDto;
  direction: DocumentDirectionDto;
  month: number;
  date: string;
  amount: number;
  status: DocumentStatusDto;
  /**
   * The status as STORED, without the `deriveEffectiveStatus` derivation the
   * backend applies to `status`. Only used to preload the edit form — never
   * to paint anything (see D5 of the document-crud plan). Reading `status`
   * here to prefill a form would turn a derived "vencido" into a persisted
   * one the moment the form is saved without touching the selector.
   */
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
  /** The status as STORED, without derivation. See `DocumentDto.rawStatus`. */
  rawStatus: DocumentStatusDto;
  date: string;
  dueDate: string | null;
  amount: number;
  currency: string;
  issuerName: string | null;
  invoiceNumber: string | null;
  supplierId: string | null;
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
}

/**
 * All 17 editable fields (D2 of the document-crud plan), all optional:
 * an absent key means "leave untouched", an explicit `null` clears it.
 * Deliberately excludes `month` (derived server-side from `date`, D4),
 * `projectId` (moving projects is out of scope, C2) and every file field
 * (`fileName`/`mimeType`/`fileSize`/`content`: the PDF isn't editable, C1).
 * Sending any of those trips `forbidNonWhitelisted` on the backend (400).
 *
 * `currency` is a loose `string`, mirroring `CreateDocumentPayload` above:
 * `ProjectDocument.currency` is a plain `string`, so typing this as a
 * literal union would break as soon as the edit form preloads it.
 */
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
}

export interface SupplierDto {
  id: string;
  name: string;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  iban?: string | null;
  notes?: string | null;
}

export interface CreateSupplierPayload {
  name: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  iban?: string;
  notes?: string;
}

export interface UpdateSupplierPayload {
  name?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  iban?: string;
  notes?: string;
}

export interface InvoiceLineDto {
  description: string;
  unitPrice: number;
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

/**
 * Exact mirror of `CreateInvoiceDto` (`apps/back/.../invoices/infrastructure/http/dtos/create-invoice.dto.ts`):
 * the `ValidationPipe` uses `forbidNonWhitelisted`, so any extra field here would trip a 400.
 * `issueDate` is part of the contract but never set by the current form — the backend
 * defaults it to today (D2/U3 of the invoice-generator-poc plan) — and the project itself
 * is never sent as the invoice's customer (D5/D7): only the receiver fields below are.
 */
export interface CreateInvoicePayload {
  projectId: string;
  issueDate?: string;
  lines: InvoiceLineDto[];
  taxRate?: number;
  irpfRate?: number;
  customerName: string;
  customerTaxId?: string;
  customerAddress?: string;
  notes?: string;
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

export interface DashboardPreviousYearDto {
  year: number;
  income: number;
  expenses: number;
  profit: number;
  margin: number;
  totalDocuments: number;
}

export interface BudgetVsActualEntryDto {
  projectId: string;
  name: string;
  currency: ProjectCurrencyDto;
  budget: number | null;
  income: number;
  expenses: number;
  consumptionPct: number | null;
}

export interface VatByQuarterEntryDto {
  quarter: 1 | 2 | 3 | 4;
  outputVat: number;
  inputVat: number;
  balance: number;
}

export interface CashflowForecastBucketDto {
  inflow: number;
  outflow: number;
  net: number;
}

export interface CashflowForecastMonthDto extends CashflowForecastBucketDto {
  /** "YYYY-MM" */
  month: string;
}

export interface CashflowForecastDto {
  overdue: CashflowForecastBucketDto;
  months: CashflowForecastMonthDto[];
}

export interface CompanyDashboardDto {
  year: number;
  availableYears: number[];
  projectCount: number;
  totalDocuments: number;
  income: number;
  expenses: number;
  profit: number;
  margin: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  amountByStatus: {
    pagado: number;
    pendiente: number;
    vencido: number;
  };
  monthlyIncome: number[];
  monthlyExpenses: number[];
  monthlyProfit: number[];
  cumulativeProfit: number[];
  monthlyMargin: number[];
  categoryTotals: {
    factura: number;
    nomina: number;
    impuesto: number;
  };
  topIssuers: { key: string; name: string | null; total: number }[];
  topProjects: {
    id: string;
    name: string;
    documentCount: number;
    total: number;
  }[];
  previousYear: DashboardPreviousYearDto;
  budgetVsActual: BudgetVsActualEntryDto[];
  vatByQuarter: VatByQuarterEntryDto[];
  cashflowForecast: CashflowForecastDto;
}

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

export interface ExtractionQualityTopHintDto {
  issuerName: string;
  field: ExtractionHintField;
  occurrences: number;
}

export interface ExtractionQualityDto {
  totalExtractions: number;
  bySource: Record<ExtractInvoiceSource, number>;
  byConfidence: Record<ExtractInvoiceConfidence, number>;
  avgCorrectedFields: number;
  correctionRate: number;
  topHints: ExtractionQualityTopHintDto[];
}
