import { DocumentType } from '../../domain/document-type';
import { DocumentStatus } from '../../domain/document-status';
import { DocumentCurrency } from '../../domain/document-currency';
import { DocumentDirection } from '../../domain/document-direction';

/**
 * The 17 editable fields from D2 of the document-crud plan, all optional
 * (absence = leave untouched). `id`, `projectId`, `month` and every
 * file-related field are deliberately absent:
 * - `projectId` is not editable (C2): moving a document to another project
 *   is a different operation with its own semantics.
 * - `month` is derived from `date` on the server (D4) and never accepted
 *   from the client.
 * - `fileName`/`mimeType`/`fileSize`/`content` are not editable (C1): the
 *   PATCH is JSON-only, no file replacement.
 */
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
