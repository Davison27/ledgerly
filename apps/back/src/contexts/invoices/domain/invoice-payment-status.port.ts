export const INVOICE_PAYMENT_STATUS_PROVIDER = Symbol('InvoicePaymentStatusProvider');

export type InvoicePaymentStatus = 'pagado' | 'pendiente' | 'vencido';

export interface InvoiceDocumentPaymentStatus {
  documentId: string;
  status: InvoicePaymentStatus;
}

export interface InvoicePaymentStatusProvider {
  findByDocumentIds(documentIds: string[]): Promise<InvoiceDocumentPaymentStatus[]>;
}
