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
  brandColor?: string | null;
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
  brandColor?: string;
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

export interface ProductDto {
  id: string;
  name: string;
  price: number | null;
}

export interface CreateProductPayload {
  name: string;
  price?: number;
}

export interface UpdateProductPayload {
  name?: string;
  price?: number;
}

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

export interface StaffMemberDto {
  id: string;
  firstName: string;
  lastName: string;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  hireDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
}

export interface CreateStaffMemberPayload {
  firstName: string;
  lastName: string;
  taxId?: string;
  email?: string;
  phone?: string;
  position?: string;
  hireDate?: string;
  endDate?: string;
  notes?: string;
}

export interface UpdateStaffMemberPayload {
  firstName?: string;
  lastName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  position?: string;
  hireDate?: string;
  endDate?: string | null;
  notes?: string;
}

export interface StaffDocumentTypeDto {
  id: string;
  code: string;
  name: string;
  expires: boolean;
  defaultValidityMonths: number | null;
  isSystem: boolean;
}

export interface StaffDocumentDto {
  id: string;
  staffMemberId: string;
  typeId: string;
  name: string;
  issueDate: string;
  expiryDate: string | null;
  notes?: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface CreateStaffDocumentPayload {
  typeId: string;
  name: string;
  issueDate: string;
  expiryDate?: string;
  notes?: string;
}

export interface UpdateStaffDocumentPayload {
  name?: string;
  issueDate?: string;
  expiryDate?: string | null;
  notes?: string | null;
}
