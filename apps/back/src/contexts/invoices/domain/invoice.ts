import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';
import { InvoiceLine, InvoiceLineProps } from './invoice-line';
import { InvoiceNumber } from './invoice-number';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_TAX_RATE = 21;
const DEFAULT_IRPF_RATE = 0;
const DEFAULT_CURRENCY = 'EUR';

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface InvoiceProps {
  id: string;
  series: string;
  year: number;
  number: number;
  issueDate: string;
  projectId: string;
  customerName: string;
  customerTaxId: string | null;
  customerAddress: string | null;
  lines: InvoiceLine[];
  taxBase: number;
  taxRate: number;
  taxAmount: number;
  irpfRate: number;
  irpfAmount: number;
  total: number;
  currency: string;
  notes: string | null;
  documentId: string | null;
  pdfSize: number | null;
}

export interface CreateInvoiceProps {
  id: string;
  series: string;
  year: number;
  number: number;
  issueDate: string;
  projectId: string;
  customerName: string;
  customerTaxId?: string | null;
  customerAddress?: string | null;
  lines: InvoiceLineProps[];
  taxRate?: number;
  irpfRate?: number;
  currency?: string;
  notes?: string | null;
  documentId?: string | null;
}

export class Invoice {
  private id: string;
  private series: string;
  private year: number;
  private number: number;
  private issueDate: string;
  private projectId: string;
  private customerName: string;
  private customerTaxId: string | null;
  private customerAddress: string | null;
  private lines: InvoiceLine[];
  private taxBase: number;
  private taxRate: number;
  private taxAmount: number;
  private irpfRate: number;
  private irpfAmount: number;
  private total: number;
  private currency: string;
  private notes: string | null;
  private documentId: string | null;
  private pdfSize: number | null;

  private constructor(props: InvoiceProps) {
    this.id = props.id;
    this.series = props.series;
    this.year = props.year;
    this.number = props.number;
    this.issueDate = props.issueDate;
    this.projectId = props.projectId;
    this.customerName = props.customerName;
    this.customerTaxId = props.customerTaxId;
    this.customerAddress = props.customerAddress;
    this.lines = props.lines;
    this.taxBase = props.taxBase;
    this.taxRate = props.taxRate;
    this.taxAmount = props.taxAmount;
    this.irpfRate = props.irpfRate;
    this.irpfAmount = props.irpfAmount;
    this.total = props.total;
    this.currency = props.currency;
    this.notes = props.notes;
    this.documentId = props.documentId;
    this.pdfSize = props.pdfSize;
  }

  /**
   * Validates the invariants and computes the D3 totals (taxBase, taxAmount,
   * irpfAmount, total) here, in this single place, so the canonical
   * calculation never drifts from what actually gets persisted and printed.
   * `number` is a provisional placeholder at this point: the real
   * correlative is assigned by `InvoiceRepository.saveWithNumber` inside the
   * advisory-lock transaction (D2).
   */
  static create(props: CreateInvoiceProps): Invoice {
    if (props.lines.length === 0) {
      throw new InvalidValueException('an invoice must have at least one line');
    }

    if (props.customerName.trim().length === 0) {
      throw new InvalidValueException('customerName must not be empty');
    }

    if (!DATE_PATTERN.test(props.issueDate)) {
      throw new InvalidValueException('issueDate must match the format YYYY-MM-DD');
    }

    const taxRate = props.taxRate ?? DEFAULT_TAX_RATE;
    const irpfRate = props.irpfRate ?? DEFAULT_IRPF_RATE;

    if (taxRate < 0) {
      throw new InvalidValueException('taxRate must be greater than or equal to 0');
    }

    if (irpfRate < 0) {
      throw new InvalidValueException('irpfRate must be greater than or equal to 0');
    }

    const lines = props.lines.map((line) => InvoiceLine.create(line));
    const taxBase = round(lines.reduce((sum, line) => sum + line.getUnitPrice(), 0));
    const taxAmount = round((taxBase * taxRate) / 100);
    const irpfAmount = round((taxBase * irpfRate) / 100);
    const total = round(taxBase + taxAmount - irpfAmount);

    return new Invoice({
      id: props.id,
      series: props.series,
      year: props.year,
      number: props.number,
      issueDate: props.issueDate,
      projectId: props.projectId,
      customerName: props.customerName,
      customerTaxId: props.customerTaxId ?? null,
      customerAddress: props.customerAddress ?? null,
      lines,
      taxBase,
      taxRate,
      taxAmount,
      irpfRate,
      irpfAmount,
      total,
      currency: props.currency ?? DEFAULT_CURRENCY,
      notes: props.notes ?? null,
      documentId: props.documentId ?? null,
      pdfSize: null,
    });
  }

  static fromPrimitives(props: InvoiceProps): Invoice {
    return new Invoice(props);
  }

  /**
   * Returns a copy with the definitive series/year/number assigned by
   * `InvoiceRepository.saveWithNumber` once the advisory lock has resolved
   * the correlative (D2). Every other field is untouched.
   */
  withNumber(series: string, year: number, number: number): Invoice {
    return new Invoice({ ...this.toPrimitives(), series, year, number });
  }

  /**
   * Returns a copy linked to its mirror document (D1/D9). Called after the
   * ledger entry publisher has created the `document` row.
   */
  withDocumentId(documentId: string | null): Invoice {
    return new Invoice({ ...this.toPrimitives(), documentId });
  }

  /**
   * Returns a copy with the size of the just-generated PDF recorded, so
   * `hasPdf()` reflects reality without the caller needing to re-read the
   * invoice from storage (D4: the PDF is generated once, right here).
   */
  withPdfSize(pdfSize: number): Invoice {
    return new Invoice({ ...this.toPrimitives(), pdfSize });
  }

  getId(): string {
    return this.id;
  }

  getSeries(): string {
    return this.series;
  }

  getYear(): number {
    return this.year;
  }

  getNumber(): number {
    return this.number;
  }

  getFullNumber(): string {
    return InvoiceNumber.create({ series: this.series, year: this.year, number: this.number }).toString();
  }

  getIssueDate(): string {
    return this.issueDate;
  }

  getProjectId(): string {
    return this.projectId;
  }

  getCustomerName(): string {
    return this.customerName;
  }

  getCustomerTaxId(): string | null {
    return this.customerTaxId;
  }

  getCustomerAddress(): string | null {
    return this.customerAddress;
  }

  getLines(): InvoiceLine[] {
    return [...this.lines];
  }

  getTaxBase(): number {
    return this.taxBase;
  }

  getTaxRate(): number {
    return this.taxRate;
  }

  getTaxAmount(): number {
    return this.taxAmount;
  }

  getIrpfRate(): number {
    return this.irpfRate;
  }

  getIrpfAmount(): number {
    return this.irpfAmount;
  }

  getTotal(): number {
    return this.total;
  }

  getCurrency(): string {
    return this.currency;
  }

  getNotes(): string | null {
    return this.notes;
  }

  getDocumentId(): string | null {
    return this.documentId;
  }

  hasPdf(): boolean {
    return this.pdfSize !== null;
  }

  toPrimitives(): InvoiceProps {
    return {
      id: this.id,
      series: this.series,
      year: this.year,
      number: this.number,
      issueDate: this.issueDate,
      projectId: this.projectId,
      customerName: this.customerName,
      customerTaxId: this.customerTaxId,
      customerAddress: this.customerAddress,
      lines: this.lines,
      taxBase: this.taxBase,
      taxRate: this.taxRate,
      taxAmount: this.taxAmount,
      irpfRate: this.irpfRate,
      irpfAmount: this.irpfAmount,
      total: this.total,
      currency: this.currency,
      notes: this.notes,
      documentId: this.documentId,
      pdfSize: this.pdfSize,
    };
  }
}
