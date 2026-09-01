import { CreatableDocumentType } from '../../domain/document-type';
import { DocumentStatus } from '../../domain/document-status';
import { DocumentCurrency } from '../../domain/document-currency';
import { DocumentDirection } from '../../domain/document-direction';

export interface CreateDocumentCommand {
  projectId: string;
  name: string;
  type: CreatableDocumentType;
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
  supplierId?: string | null;
  direction: DocumentDirection;
  file?: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    size: number;
  };
}
