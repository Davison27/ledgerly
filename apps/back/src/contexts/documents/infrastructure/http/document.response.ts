import { Document } from '../../domain/document';
import { DocumentType } from '../../domain/document-type';
import { DocumentStatus } from '../../domain/document-status';
import { DocumentCurrency } from '../../domain/document-currency';
import { deriveEffectiveStatus, todayIso } from '../../domain/effective-status';

export class DocumentResponse {
  id: string;
  name: string;
  type: DocumentType;
  month: number;
  date: string;
  amount: number;
  status: DocumentStatus;
  issuerName: string | null;
  issuerTaxId: string | null;
  invoiceNumber: string | null;
  dueDate: string | null;
  taxBase: number | null;
  taxRate: number | null;
  taxAmount: number | null;
  currency: DocumentCurrency;
  hasFile: boolean;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  supplierId: string | null;

  static fromDomain(document: Document): DocumentResponse {
    const response = new DocumentResponse();

    response.id = document.getId();
    response.name = document.getName();
    response.type = document.getType();
    response.month = document.getMonth();
    response.date = document.getDate();
    response.amount = document.getAmount();
    response.dueDate = document.getDueDate();
    response.status = deriveEffectiveStatus(document.getStatus(), response.dueDate, todayIso());
    response.issuerName = document.getIssuerName();
    response.issuerTaxId = document.getIssuerTaxId();
    response.invoiceNumber = document.getInvoiceNumber();
    response.taxBase = document.getTaxBase();
    response.taxRate = document.getTaxRate();
    response.taxAmount = document.getTaxAmount();
    response.currency = document.getCurrency();
    response.hasFile = document.hasFile();
    response.fileName = document.getFileName();
    response.fileSize = document.getFileSize();
    response.mimeType = document.getMimeType();
    response.supplierId = document.getSupplierId();

    return response;
  }
}
