import { Document } from '../../domain/document';
import { DocumentType } from '../../domain/document-type';
import { DocumentStatus } from '../../domain/document-status';
import { DocumentCurrency } from '../../domain/document-currency';
import { DocumentDirection } from '../../domain/document-direction';
import { deriveEffectiveStatus, todayIso } from '../../domain/effective-status';

export class DocumentResponse {
  id: string;
  projectId: string;
  name: string;
  type: DocumentType;
  month: number;
  date: string;
  amount: number;
  status: DocumentStatus;
  /**
   * The status as STORED, without `deriveEffectiveStatus`. `status` above
   * stays derived and is what every read view (list, ficha, filters) must
   * keep using to paint the document. `rawStatus` exists for exactly one
   * purpose: preloading the edit form, so that saving without touching the
   * status selector cannot turn a derived `vencido` into a persisted one
   * (see D5 of the document-crud plan). Do not remove either field: they
   * mean different things and are meant to coexist.
   */
  rawStatus: DocumentStatus;
  issuerName: string | null;
  issuerTaxId: string | null;
  invoiceNumber: string | null;
  dueDate: string | null;
  taxBase: number | null;
  taxRate: number | null;
  taxAmount: number | null;
  irpfRate: number | null;
  irpfAmount: number | null;
  currency: DocumentCurrency;
  hasFile: boolean;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  supplierId: string | null;
  direction: DocumentDirection;

  static fromDomain(document: Document): DocumentResponse {
    const response = new DocumentResponse();

    response.id = document.getId();
    response.projectId = document.getProjectId();
    response.name = document.getName();
    response.type = document.getType();
    response.month = document.getMonth();
    response.date = document.getDate();
    response.amount = document.getAmount();
    response.dueDate = document.getDueDate();
    response.status = deriveEffectiveStatus(document.getStatus(), response.dueDate, todayIso());
    response.rawStatus = document.getStatus();
    response.issuerName = document.getIssuerName();
    response.issuerTaxId = document.getIssuerTaxId();
    response.invoiceNumber = document.getInvoiceNumber();
    response.taxBase = document.getTaxBase();
    response.taxRate = document.getTaxRate();
    response.taxAmount = document.getTaxAmount();
    response.irpfRate = document.getIrpfRate();
    response.irpfAmount = document.getIrpfAmount();
    response.currency = document.getCurrency();
    response.hasFile = document.hasFile();
    response.fileName = document.getFileName();
    response.fileSize = document.getFileSize();
    response.mimeType = document.getMimeType();
    response.supplierId = document.getSupplierId();
    response.direction = document.getDirection();

    return response;
  }
}
