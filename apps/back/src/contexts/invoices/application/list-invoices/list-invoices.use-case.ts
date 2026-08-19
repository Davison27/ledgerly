import { Inject, Injectable } from '@nestjs/common';
import { InvoiceListItem } from './invoice-list-item';
import {
  INVOICE_PAYMENT_STATUS_PROVIDER,
  InvoicePaymentStatusProvider,
} from '../../domain/invoice-payment-status.port';
import { INVOICE_REPOSITORY, InvoiceRepository } from '../../domain/invoice.repository';
import { Page, PageRequest } from '../../../../shared/domain/pagination';

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

  async executePage(request: PageRequest, search?: string): Promise<Page<InvoiceListItem>> {
    if (!this.invoiceRepository.findPage) {
      const items = await this.execute();
      const start = (request.page - 1) * request.size;

      return {
        items: items.slice(start, start + request.size),
        total: items.length,
        page: request.page,
        size: request.size,
      };
    }

    const page = await this.invoiceRepository.findPage(request, search);
    const documentIds = [
      ...new Set(
        page.items
          .map((invoice) => invoice.getDocumentId())
          .filter((documentId): documentId is string => documentId !== null),
      ),
    ];
    const statuses = await this.paymentStatusProvider.findByDocumentIds(documentIds);
    const statusesByDocument = new Map(
      statuses.map((status) => [status.documentId, status.status]),
    );

    return {
      ...page,
      items: page.items.map((invoice) => {
        const documentId = invoice.getDocumentId();

        return {
          invoice,
          paymentStatus: documentId !== null ? statusesByDocument.get(documentId) ?? null : null,
        };
      }),
    };
  }
}
