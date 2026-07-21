import { DeleteInvoiceUseCase } from './delete-invoice.use-case';
import { Invoice } from '../../domain/invoice';
import { InvoiceRepository } from '../../domain/invoice.repository';
import { InvoiceNotFoundException } from '../../domain/errors/invoice-not-found.exception';
import { DeleteDocumentUseCase } from '../../../documents/application/delete-document/delete-document.use-case';

function buildInvoice(documentId: string | null): Invoice {
  const invoice = Invoice.create({
    id: 'invoice-1',
    series: 'F',
    year: 2026,
    number: 1,
    issueDate: '2026-06-01',
    projectId: 'project-1',
    customerName: 'Cliente SL',
    lines: [{ description: 'Consultoría', unitPrice: 100, quantity: 1 }],
  }).withNumber('F', 2026, 1);

  return documentId !== null ? invoice.withDocumentId(documentId) : invoice;
}

class FakeInvoiceRepository implements Partial<InvoiceRepository> {
  deleteCalls: string[] = [];

  constructor(private readonly invoice: Invoice | null) {}

  findById(): Promise<Invoice | null> {
    return Promise.resolve(this.invoice);
  }

  delete(id: string): Promise<void> {
    this.deleteCalls.push(id);
    return Promise.resolve();
  }
}

describe('DeleteInvoiceUseCase', () => {
  it('throws InvoiceNotFoundException when the invoice does not exist', async () => {
    const repository = new FakeInvoiceRepository(null);
    const deleteDocumentExecute = jest.fn();
    const useCase = new DeleteInvoiceUseCase(repository as unknown as InvoiceRepository, {
      execute: deleteDocumentExecute,
    } as unknown as DeleteDocumentUseCase);

    await expect(useCase.execute('missing')).rejects.toThrow(InvoiceNotFoundException);
    expect(deleteDocumentExecute).not.toHaveBeenCalled();
  });

  it('deletes the invoice and, when it has no mirror document, does not touch documents', async () => {
    const repository = new FakeInvoiceRepository(buildInvoice(null));
    const deleteDocumentExecute = jest.fn();
    const useCase = new DeleteInvoiceUseCase(repository as unknown as InvoiceRepository, {
      execute: deleteDocumentExecute,
    } as unknown as DeleteDocumentUseCase);

    await useCase.execute('invoice-1');

    expect(repository.deleteCalls).toEqual(['invoice-1']);
    expect(deleteDocumentExecute).not.toHaveBeenCalled();
  });

  it('also deletes the mirror document when documentId is not null (D9)', async () => {
    const repository = new FakeInvoiceRepository(buildInvoice('document-1'));
    const deleteDocumentExecute = jest.fn(() => Promise.resolve());
    const useCase = new DeleteInvoiceUseCase(repository as unknown as InvoiceRepository, {
      execute: deleteDocumentExecute,
    } as unknown as DeleteDocumentUseCase);

    await useCase.execute('invoice-1');

    expect(repository.deleteCalls).toEqual(['invoice-1']);
    expect(deleteDocumentExecute).toHaveBeenCalledWith('document-1');
  });

  it('still deletes the invoice when deleting the mirror document fails', async () => {
    const repository = new FakeInvoiceRepository(buildInvoice('document-1'));
    const deleteDocumentExecute = jest.fn(() => Promise.reject(new Error('boom')));
    const useCase = new DeleteInvoiceUseCase(repository as unknown as InvoiceRepository, {
      execute: deleteDocumentExecute,
    } as unknown as DeleteDocumentUseCase);

    await expect(useCase.execute('invoice-1')).resolves.toBeUndefined();
    expect(repository.deleteCalls).toEqual(['invoice-1']);
  });
});
