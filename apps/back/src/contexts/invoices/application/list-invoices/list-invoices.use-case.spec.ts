import { ListInvoicesUseCase } from './list-invoices.use-case';
import { Invoice } from '../../domain/invoice';
import {
  InvoiceDocumentPaymentStatus,
  InvoicePaymentStatusProvider,
} from '../../domain/invoice-payment-status.port';
import { InvoiceRepository } from '../../domain/invoice.repository';

class InMemoryInvoiceRepository implements InvoiceRepository {
  constructor(private readonly invoices: Invoice[]) {}

  findAll(): Promise<Invoice[]> {
    return Promise.resolve(this.invoices);
  }

  findById(): Promise<Invoice | null> {
    return Promise.resolve(null);
  }

  saveWithNumber(): Promise<Invoice> {
    return Promise.reject(new Error('not used'));
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }

  savePdf(): Promise<void> {
    return Promise.resolve();
  }

  findPdf(): Promise<Buffer | null> {
    return Promise.resolve(null);
  }

  linkDocument(): Promise<void> {
    return Promise.resolve();
  }
}

class InMemoryInvoicePaymentStatusProvider implements InvoicePaymentStatusProvider {
  public receivedIds: string[] = [];

  constructor(private readonly statuses: InvoiceDocumentPaymentStatus[]) {}

  findByDocumentIds(documentIds: string[]): Promise<InvoiceDocumentPaymentStatus[]> {
    this.receivedIds = documentIds;
    return Promise.resolve(this.statuses);
  }
}

function buildInvoice(id: string, documentId: string | null): Invoice {
  return Invoice.create({
    id,
    series: 'F',
    year: 2026,
    number: 1,
    issueDate: '2026-06-01',
    projectId: 'project-1',
    customerName: 'Cliente SL',
    lines: [{ description: 'Consultoría', unitPrice: 100, quantity: 1 }],
    documentId,
  });
}

describe('ListInvoicesUseCase', () => {
  it('composes effective payment statuses and leaves unresolved documents as null', async () => {
    const statusProvider = new InMemoryInvoicePaymentStatusProvider([
      { documentId: 'document-overdue', status: 'vencido' },
    ]);
    const useCase = new ListInvoicesUseCase(
      new InMemoryInvoiceRepository([
        buildInvoice('invoice-1', 'document-overdue'),
        buildInvoice('invoice-2', 'document-missing'),
        buildInvoice('invoice-3', null),
      ]),
      statusProvider,
    );

    const result = await useCase.execute();

    expect(result.map((item) => item.paymentStatus)).toEqual(['vencido', null, null]);
    expect(statusProvider.receivedIds).toEqual(['document-overdue', 'document-missing']);
  });
});
