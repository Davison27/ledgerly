import { InvoicePaymentStatus } from '../../domain/invoice-payment-status.port';
import { Invoice } from '../../domain/invoice';

export interface InvoiceListItem {
  invoice: Invoice;
  paymentStatus: InvoicePaymentStatus | null;
}
