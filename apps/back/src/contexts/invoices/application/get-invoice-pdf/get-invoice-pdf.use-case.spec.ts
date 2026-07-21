import { GetInvoicePdfUseCase } from './get-invoice-pdf.use-case';
import { Invoice } from '../../domain/invoice';
import { InvoiceRepository } from '../../domain/invoice.repository';
import { InvoiceNotFoundException } from '../../domain/errors/invoice-not-found.exception';

function buildInvoice(): Invoice {
  return Invoice.create({
    id: 'invoice-1',
    series: 'F',
    year: 2026,
    number: 1,
    issueDate: '2026-06-01',
    projectId: 'project-1',
    customerName: 'Cliente SL',
    lines: [{ description: 'Consultoría', unitPrice: 100 }],
  }).withNumber('F', 2026, 1);
}

class FakeInvoiceRepository implements Partial<InvoiceRepository> {
  constructor(
    private readonly invoice: Invoice | null,
    private readonly pdf: Buffer | null,
  ) {}

  findById(): Promise<Invoice | null> {
    return Promise.resolve(this.invoice);
  }

  findPdf(): Promise<Buffer | null> {
    return Promise.resolve(this.pdf);
  }
}

describe('GetInvoicePdfUseCase', () => {
  it('returns the stored pdf with a filename built from the full invoice number', async () => {
    const pdf = Buffer.from('%PDF-fake');
    const useCase = new GetInvoicePdfUseCase(
      new FakeInvoiceRepository(buildInvoice(), pdf) as unknown as InvoiceRepository,
    );

    const result = await useCase.execute('invoice-1');

    expect(result.content).toBe(pdf);
    expect(result.fileName).toBe('factura-F-2026-0001.pdf');
  });

  it('throws InvoiceNotFoundException (404) when the invoice has no stored pdf', async () => {
    const useCase = new GetInvoicePdfUseCase(
      new FakeInvoiceRepository(buildInvoice(), null) as unknown as InvoiceRepository,
    );

    await expect(useCase.execute('invoice-1')).rejects.toThrow(InvoiceNotFoundException);
  });

  it('throws InvoiceNotFoundException (404) when the invoice does not exist', async () => {
    const useCase = new GetInvoicePdfUseCase(
      new FakeInvoiceRepository(null, null) as unknown as InvoiceRepository,
    );

    await expect(useCase.execute('missing')).rejects.toThrow(InvoiceNotFoundException);
  });
});
