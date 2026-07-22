import { DocumentType } from '../../domain/document-type';
import { DocumentStatus } from '../../domain/document-status';
import { DocumentCurrency } from '../../domain/document-currency';
import { DocumentDirection } from '../../domain/document-direction';

export interface UpdateDocumentCommand {
  id: string;
  name?: string;
  type?: DocumentType;
  direction?: DocumentDirection;
  status?: DocumentStatus;
  date?: string;
  dueDate?: string | null;
  amount?: number;
  taxBase?: number | null;
  taxRate?: number | null;
  taxAmount?: number | null;
  irpfRate?: number | null;
  irpfAmount?: number | null;
  currency?: DocumentCurrency;
  issuerName?: string | null;
  issuerTaxId?: string | null;
  invoiceNumber?: string | null;
  supplierId?: string | null;
  staffMemberId?: string | null;
}
