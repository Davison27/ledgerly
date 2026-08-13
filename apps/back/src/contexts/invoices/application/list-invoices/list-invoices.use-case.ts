import { Inject, Injectable } from '@nestjs/common';
import { InvoiceListItem } from './invoice-list-item';
import {
  INVOICE_PAYMENT_STATUS_PROVIDER,
  InvoicePaymentStatusProvider,
} from '../../domain/invoice-payment-status.port';
import { INVOICE_REPOSITORY, InvoiceRepository } from '../../domain/invoice.repository';

@Injectable()
export class ListInvoicesUseCase {
  constructor(
    @Inject(INVOICE_REPOSITORY) private readonly invoiceRepository: InvoiceRepository,
    @Inject(INVOICE_PAYMENT_STATUS_PROVIDER)
    private readonly paymentStatusProvider: InvoicePaymentStatusProvider,
  ) {}

  async execute(): Promise<InvoiceListItem[]> {
    const invoices = await this.invoiceRepository.findAll();
    const documentIds = [
      ...new Set(
        invoices
          .map((invoice) => invoice.getDocumentId())
          .filter((documentId): documentId is string => documentId !== null),
      ),
    ];
    const statuses = await this.paymentStatusProvider.findByDocumentIds(documentIds);
    const statusesByDocument = new Map(
      statuses.map((status) => [status.documentId, status.status]),
    );

    return invoices.map((invoice) => {
      const documentId = invoice.getDocumentId();

      return {
        invoice,
        paymentStatus: documentId !== null ? statusesByDocument.get(documentId) ?? null : null,
      };
    });
  }
}
