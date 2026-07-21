import { CreateInvoiceUseCase } from './create-invoice.use-case';
import { Invoice } from '../../domain/invoice';
import { InvoiceRepository, InvoiceNumberAllocation } from '../../domain/invoice.repository';
import { ProjectExistenceChecker } from '../../domain/project-existence-checker.port';
import { InvoiceIssuerProvider, InvoiceIssuer } from '../../domain/invoice-issuer.port';
import { InvoicePdfRenderer, InvoicePdfView } from '../../domain/invoice-pdf-renderer.port';
import { LedgerEntryPublisher } from '../../domain/ledger-entry.port';
import { InvoiceProjectNotFoundException } from '../../domain/errors/invoice-project-not-found.exception';
import { InvalidValueException } from '../../../../shared/domain/invalid-value.exception';
import { IdGenerator } from '../../../../shared/domain/id-generator.port';

class InMemoryInvoiceRepository implements InvoiceRepository {
  invoices: Invoice[] = [];
  savedPdf: Buffer | null = null;

  findAll(): Promise<Invoice[]> {
    return Promise.resolve([...this.invoices]);
  }

  findById(id: string): Promise<Invoice | null> {
    return Promise.resolve(this.invoices.find((invoice) => invoice.getId() === id) ?? null);
  }

  saveWithNumber(invoice: Invoice, allocate: InvoiceNumberAllocation): Promise<Invoice> {
    const numbered = invoice.withNumber(allocate.series, allocate.year, this.invoices.length + 1);
    this.invoices.push(numbered);
    return Promise.resolve(numbered);
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }

  savePdf(id: string, pdf: Buffer): Promise<void> {
    this.savedPdf = pdf;
    return Promise.resolve();
  }

  findPdf(): Promise<Buffer | null> {
    return Promise.resolve(this.savedPdf);
  }

  linkDocument(): Promise<void> {
    return Promise.resolve();
  }
}

class FakeProjectExistenceChecker implements ProjectExistenceChecker {
  constructor(private readonly existingIds: Set<string>) {}

  exists(projectId: string): Promise<boolean> {
    return Promise.resolve(this.existingIds.has(projectId));
  }
}

const VALID_ISSUER: InvoiceIssuer = {
  name: 'Acme SL',
  legalName: 'Acme Sociedad Limitada',
  taxId: 'B12345678',
  address: 'Calle Falsa 123',
  city: 'Madrid',
  postalCode: '28080',
  country: 'España',
  email: 'facturacion@acme.example',
  phone: '600111222',
  website: null,
  logo: null,
};

class FakeIssuerProvider implements InvoiceIssuerProvider {
  constructor(private readonly issuer: InvoiceIssuer | (() => InvoiceIssuer)) {}

  get(): Promise<InvoiceIssuer> {
    const issuer = typeof this.issuer === 'function' ? this.issuer() : this.issuer;
    return Promise.resolve(issuer);
  }
}

class SequentialIdGenerator implements IdGenerator {
  private nextId = 1;

  generate(): string {
    return `invoice-${this.nextId++}`;
  }
}

const BASE_COMMAND = {
  projectId: 'project-1',
  issueDate: '2026-06-01',
  lines: [{ description: 'Consultoría', unitPrice: 100, quantity: 1 }],
  customerName: 'Cliente SL',
};

describe('CreateInvoiceUseCase', () => {
  it('throws InvoiceProjectNotFoundException before requesting the issuer', async () => {
    const issuerGet = jest.fn(() => Promise.resolve(VALID_ISSUER));
    const useCase = new CreateInvoiceUseCase(
      new InMemoryInvoiceRepository(),
      new FakeProjectExistenceChecker(new Set()),
      { get: issuerGet },
      { render: jest.fn() },
      { publish: jest.fn() },
      new SequentialIdGenerator(),
    );

    await expect(useCase.execute(BASE_COMMAND)).rejects.toThrow(InvoiceProjectNotFoundException);
    expect(issuerGet).not.toHaveBeenCalled();
  });

  it('propagates InvalidValueException when the company is missing taxId (D8)', async () => {
    const useCase = new CreateInvoiceUseCase(
      new InMemoryInvoiceRepository(),
      new FakeProjectExistenceChecker(new Set(['project-1'])),
      {
        get: () => Promise.reject(new InvalidValueException('company.taxId is required to issue invoices')),
      },
      { render: jest.fn() },
      { publish: jest.fn() },
      new SequentialIdGenerator(),
    );

    await expect(useCase.execute(BASE_COMMAND)).rejects.toThrow(InvalidValueException);
  });

  it('calls renderer, savePdf and the ledger publisher in that order', async () => {
    const calls: string[] = [];
    const repository = new InMemoryInvoiceRepository();
    const originalSavePdf = repository.savePdf.bind(repository);
    repository.savePdf = (id: string, pdf: Buffer) => {
      calls.push('savePdf');
      return originalSavePdf(id, pdf);
    };

    const renderer: InvoicePdfRenderer = {
      render: (view: InvoicePdfView) => {
        calls.push('render');
        return Promise.resolve(Buffer.from(`%PDF-fake ${view.number}`));
      },
    };

    const publisher: LedgerEntryPublisher = {
      publish: () => {
        calls.push('publish');
        return Promise.resolve('document-1');
      },
    };

    const useCase = new CreateInvoiceUseCase(
      repository,
      new FakeProjectExistenceChecker(new Set(['project-1'])),
      new FakeIssuerProvider(VALID_ISSUER),
      renderer,
      publisher,
      new SequentialIdGenerator(),
    );

    const invoice = await useCase.execute(BASE_COMMAND);

    expect(calls).toEqual(['render', 'savePdf', 'publish']);
    expect(invoice.getDocumentId()).toBe('document-1');
    expect(invoice.getFullNumber()).toBe('F-2026-0001');
  });

  it('does not fail the invoice creation when linking the mirror document fails', async () => {
    const repository = new InMemoryInvoiceRepository();
    repository.linkDocument = () => Promise.reject(new Error('boom'));

    const useCase = new CreateInvoiceUseCase(
      repository,
      new FakeProjectExistenceChecker(new Set(['project-1'])),
      new FakeIssuerProvider(VALID_ISSUER),
      { render: () => Promise.resolve(Buffer.from('%PDF-fake')) },
      { publish: () => Promise.resolve('document-1') },
      new SequentialIdGenerator(),
    );

    const invoice = await useCase.execute(BASE_COMMAND);

    expect(invoice.getDocumentId()).toBe('document-1');
  });
});
