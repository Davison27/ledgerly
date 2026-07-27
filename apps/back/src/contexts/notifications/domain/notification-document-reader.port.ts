export const NOTIFICATION_DOCUMENT_READER = Symbol('NotificationDocumentReader');

export interface NotificationDocumentRow {
  id: string;
  projectId: string;
  name: string;
  amount: number;
  dueDate: string | null;
  type: string;
}

export interface NotificationDocumentReader {
  findPendingDueUpTo(limitDate: string): Promise<NotificationDocumentRow[]>;
  findInvoicesWithoutInvoiceNumber(): Promise<NotificationDocumentRow[]>;
}
