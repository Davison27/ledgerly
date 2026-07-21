import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';
import { DocumentType } from './document-type';
import { DocumentStatus } from './document-status';
import { DOCUMENT_CURRENCIES, DocumentCurrency } from './document-currency';
import { DOCUMENT_DIRECTIONS, DocumentDirection } from './document-direction';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface DocumentProps {
  id: string;
  projectId: string;
  name: string;
  type: DocumentType;
  month: number;
  date: string;
  amount: number;
  status: DocumentStatus;
  issuerName?: string | null;
  issuerTaxId?: string | null;
  invoiceNumber?: string | null;
  dueDate?: string | null;
  taxBase?: number | null;
  taxRate?: number | null;
  taxAmount?: number | null;
  irpfRate?: number | null;
  irpfAmount?: number | null;
  currency?: DocumentCurrency;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  supplierId?: string | null;
  direction: DocumentDirection;
}

export class Document {
  private id: string;
  private projectId: string;
  private name: string;
  private type: DocumentType;
  private month: number;
  private date: string;
  private amount: number;
  private status: DocumentStatus;
  private issuerName: string | null;
  private issuerTaxId: string | null;
  private invoiceNumber: string | null;
  private dueDate: string | null;
  private taxBase: number | null;
  private taxRate: number | null;
  private taxAmount: number | null;
  private irpfRate: number | null;
  private irpfAmount: number | null;
  private currency: DocumentCurrency;
  private fileName: string | null;
  private mimeType: string | null;
  private fileSize: number | null;
  private supplierId: string | null;
  private direction: DocumentDirection;

  private constructor(props: DocumentProps) {
    this.id = props.id;
    this.projectId = props.projectId;
    this.name = props.name;
    this.type = props.type;
    this.month = props.month;
    this.date = props.date;
    this.amount = props.amount;
    this.status = props.status;
    this.issuerName = props.issuerName ?? null;
    this.issuerTaxId = props.issuerTaxId ?? null;
    this.invoiceNumber = props.invoiceNumber ?? null;
    this.dueDate = props.dueDate ?? null;
    this.taxBase = props.taxBase ?? null;
    this.taxRate = props.taxRate ?? null;
    this.taxAmount = props.taxAmount ?? null;
    this.irpfRate = props.irpfRate ?? null;
    this.irpfAmount = props.irpfAmount ?? null;
    this.currency = props.currency ?? 'EUR';
    this.fileName = props.fileName ?? null;
    this.mimeType = props.mimeType ?? null;
    this.fileSize = props.fileSize ?? null;
    this.supplierId = props.supplierId ?? null;
    this.direction = props.direction;
  }

  static create(props: DocumentProps): Document {
    if (!Number.isInteger(props.month) || props.month < 1 || props.month > 12) {
      throw new InvalidValueException('month must be an integer between 1 and 12');
    }

    if (props.amount < 0) {
      throw new InvalidValueException('amount must be greater than or equal to 0');
    }

    if (!DATE_PATTERN.test(props.date)) {
      throw new InvalidValueException('date must match the format YYYY-MM-DD');
    }

    if (props.dueDate != null && !DATE_PATTERN.test(props.dueDate)) {
      throw new InvalidValueException('dueDate must match the format YYYY-MM-DD');
    }

    if (props.taxBase != null && props.taxBase < 0) {
      throw new InvalidValueException('taxBase must be greater than or equal to 0');
    }

    if (props.taxRate != null && props.taxRate < 0) {
      throw new InvalidValueException('taxRate must be greater than or equal to 0');
    }

    if (props.taxAmount != null && props.taxAmount < 0) {
      throw new InvalidValueException('taxAmount must be greater than or equal to 0');
    }

    if (props.irpfRate != null && props.irpfRate < 0) {
      throw new InvalidValueException('irpfRate must be greater than or equal to 0');
    }

    if (props.irpfAmount != null && props.irpfAmount < 0) {
      throw new InvalidValueException('irpfAmount must be greater than or equal to 0');
    }

    if (!DOCUMENT_DIRECTIONS.includes(props.direction)) {
      throw new InvalidValueException('direction must be one of ingreso, gasto');
    }

    if (props.currency != null && !DOCUMENT_CURRENCIES.includes(props.currency)) {
      throw new InvalidValueException('currency must be one of EUR, USD, GBP');
    }

    if (props.fileSize != null && props.fileSize < 0) {
      throw new InvalidValueException('fileSize must be greater than or equal to 0');
    }

    return new Document(props);
  }

  static fromPrimitives(props: DocumentProps): Document {
    return new Document(props);
  }

  getId(): string {
    return this.id;
  }

  getProjectId(): string {
    return this.projectId;
  }

  getName(): string {
    return this.name;
  }

  getType(): DocumentType {
    return this.type;
  }

  getMonth(): number {
    return this.month;
  }

  getDate(): string {
    return this.date;
  }

  getAmount(): number {
    return this.amount;
  }

  getStatus(): DocumentStatus {
    return this.status;
  }

  getIssuerName(): string | null {
    return this.issuerName;
  }

  getIssuerTaxId(): string | null {
    return this.issuerTaxId;
  }

  getInvoiceNumber(): string | null {
    return this.invoiceNumber;
  }

  getDueDate(): string | null {
    return this.dueDate;
  }

  getTaxBase(): number | null {
    return this.taxBase;
  }

  getTaxRate(): number | null {
    return this.taxRate;
  }

  getTaxAmount(): number | null {
    return this.taxAmount;
  }

  getIrpfRate(): number | null {
    return this.irpfRate;
  }

  getIrpfAmount(): number | null {
    return this.irpfAmount;
  }

  getDirection(): DocumentDirection {
    return this.direction;
  }

  getCurrency(): DocumentCurrency {
    return this.currency;
  }

  getFileName(): string | null {
    return this.fileName;
  }

  getMimeType(): string | null {
    return this.mimeType;
  }

  getFileSize(): number | null {
    return this.fileSize;
  }

  getSupplierId(): string | null {
    return this.supplierId;
  }

  hasFile(): boolean {
    return this.fileName !== null;
  }

  /**
   * Applies a partial set of changes by re-running them through `create()`,
   * so every invariant it enforces (month 1-12, amount >= 0, date formats,
   * tax/irpf >= 0, valid direction/currency) is re-checked in this single
   * place instead of being duplicated across per-field mutators. `id` and
   * `projectId` are deliberately excluded: identity and project ownership
   * are not editable (see D2/D3 of the document-crud plan).
   */
  withChanges(changes: Partial<Omit<DocumentProps, 'id' | 'projectId'>>): Document {
    return Document.create({ ...this.toPrimitives(), ...changes });
  }

  toPrimitives(): Required<DocumentProps> {
    return {
      id: this.id,
      projectId: this.projectId,
      name: this.name,
      type: this.type,
      month: this.month,
      date: this.date,
      amount: this.amount,
      status: this.status,
      issuerName: this.issuerName,
      issuerTaxId: this.issuerTaxId,
      invoiceNumber: this.invoiceNumber,
      dueDate: this.dueDate,
      taxBase: this.taxBase,
      taxRate: this.taxRate,
      taxAmount: this.taxAmount,
      irpfRate: this.irpfRate,
      irpfAmount: this.irpfAmount,
      currency: this.currency,
      fileName: this.fileName,
      mimeType: this.mimeType,
      fileSize: this.fileSize,
      supplierId: this.supplierId,
      direction: this.direction,
    };
  }
}
