import { DocumentType } from '../../domain/document-type';
import { DocumentStatus } from '../../domain/document-status';
import { DocumentCurrency } from '../../domain/document-currency';
import { DocumentDirection } from '../../domain/document-direction';
import { deriveEffectiveStatus, todayIso } from '../../domain/effective-status';
import { DocumentListItem } from '../../application/list-all-documents/document-list-item';

export class DocumentListItemResponse {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  type: DocumentType;
  status: DocumentStatus;
  /** The status as STORED, without `deriveEffectiveStatus`. See D5/5-bis. */
  rawStatus: DocumentStatus;
  direction: DocumentDirection;
  date: string;
  dueDate: string | null;
  amount: number;
  currency: DocumentCurrency;
  issuerName: string | null;
  invoiceNumber: string | null;
  supplierId: string | null;

  static fromResult(item: DocumentListItem): DocumentListItemResponse {
    const response = new DocumentListItemResponse();

    response.id = item.id;
    response.projectId = item.projectId;
    response.projectName = item.projectName;
    response.name = item.name;
    response.type = item.type;
    response.date = item.date;
    response.dueDate = item.dueDate;
    response.status = deriveEffectiveStatus(item.status, item.dueDate, todayIso());
    response.rawStatus = item.status;
    response.direction = item.direction;
    response.amount = item.amount;
    response.currency = item.currency;
    response.issuerName = item.issuerName;
    response.invoiceNumber = item.invoiceNumber;
    response.supplierId = item.supplierId;

    return response;
  }
}
