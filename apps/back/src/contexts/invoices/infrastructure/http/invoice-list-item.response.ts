import { InvoiceListItem } from '../../application/list-invoices/invoice-list-item';
import { InvoicePaymentStatus } from '../../domain/invoice-payment-status.port';
import { InvoiceResponse } from './invoice.response';

export class InvoiceListItemResponse extends InvoiceResponse {
  paymentStatus: InvoicePaymentStatus | null;

  static fromItem(item: InvoiceListItem): InvoiceListItemResponse {
    const response = new InvoiceListItemResponse();

    Object.assign(response, InvoiceResponse.fromDomain(item.invoice));
    response.paymentStatus = item.paymentStatus;

    return response;
  }
}
