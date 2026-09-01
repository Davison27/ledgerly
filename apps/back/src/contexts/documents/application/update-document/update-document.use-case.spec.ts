import { UpdateDocumentUseCase } from './update-document.use-case';
import { UpdateDocumentCommand } from './update-document.command';
import { DocumentRepository } from '../../domain/document.repository';
import { Document } from '../../domain/document';
import { DocumentDashboardRow } from '../../domain/document-dashboard-row';
import { DocumentListRow } from '../../domain/document-list-row';
import { DocumentDuplicateRow } from '../../domain/document-duplicate-row';
import { SupplierExistenceChecker } from '../../domain/supplier-existence-checker.port';
import { DocumentNotFoundException } from '../../domain/errors/document-not-found.exception';
import { DocumentSupplierNotFoundException } from '../../domain/errors/document-supplier-not-found.exception';
import { InvalidValueException } from '../../../../shared/domain/invalid-value.exception';

class InMemoryDocumentRepository implements DocumentRepository {
  private documents: Document[] = [];

  findByProject(): Promise<Document[]> {
    return Promise.resolve([...this.documents]);
  }

  findById(id: string): Promise<Document | null> {
    return Promise.resolve(this.documents.find((document) => document.getId() === id) ?? null);
  }

  save(document: Document): Promise<void> {
    const index = this.documents.findIndex((existing) => existing.getId() === document.getId());

    if (index === -1) {
      this.documents.push(document);
    } else {
      this.documents[index] = document;
    }

    return Promise.resolve();
  }

  delete(id: string): Promise<boolean> {
    this.documents = this.documents.filter((document) => document.getId() !== id);
    return Promise.resolve(true);
  }

  saveContent(): Promise<void> {
    return Promise.resolve();
  }

  findContent(): Promise<Buffer | null> {
    return Promise.resolve(null);
  }

  findAllForDashboard(): Promise<DocumentDashboardRow[]> {
    return Promise.resolve([]);
  }

  findAllForListing(): Promise<DocumentListRow[]> {
    return Promise.resolve([]);
  }

  findPossibleDuplicates(): Promise<DocumentDuplicateRow[]> {
    return Promise.resolve([]);
  }
}

class FakeSupplierExistenceChecker implements SupplierExistenceChecker {
  constructor(private readonly existingIds: Set<string>) {}

  exists(id: string): Promise<boolean> {
    return Promise.resolve(this.existingIds.has(id));
  }
}

function buildDocument(overrides: Partial<Parameters<typeof Document.create>[0]> = {}): Document {
  return Document.create({
    id: 'doc-1',
    projectId: 'project-1',
    name: 'Invoice',
    type: 'factura',
    month: 6,
    date: '2026-06-01',
    amount: 100,
    status: 'pendiente',
    issuerName: 'Acme SL',
    issuerTaxId: 'B12345678',
    invoiceNumber: 'INV-1',
    dueDate: '2026-07-01',
    taxBase: 90,
    taxRate: 21,
    taxAmount: 19,
    irpfRate: null,
    irpfAmount: null,
    currency: 'EUR',
    fileName: null,
    mimeType: null,
    fileSize: null,
    supplierId: null,
    direction: 'gasto',
    ...overrides,
  });
}

describe('UpdateDocumentUseCase', () => {
  it('changes only direction and leaves every other field untouched', async () => {
    const repository = new InMemoryDocumentRepository();
    const document = buildDocument();
    await repository.save(document);
    const before = document.toPrimitives();
    const useCase = new UpdateDocumentUseCase(repository, new FakeSupplierExistenceChecker(new Set()));

    const updated = await useCase.execute({ id: 'doc-1', direction: 'ingreso' });

    expect(updated.toPrimitives()).toEqual({ ...before, direction: 'ingreso' });
    const stored = await repository.findById('doc-1');
    expect(stored?.toPrimitives()).toEqual({ ...before, direction: 'ingreso' });
  });

  it('recomputes month when date changes', async () => {
    const repository = new InMemoryDocumentRepository();
    await repository.save(buildDocument({ date: '2026-06-01', month: 6 }));
    const useCase = new UpdateDocumentUseCase(repository, new FakeSupplierExistenceChecker(new Set()));

    const updated = await useCase.execute({ id: 'doc-1', date: '2026-11-15' });

    expect(updated.getDate()).toBe('2026-11-15');
    expect(updated.getMonth()).toBe(11);
  });

  it('does not accept month directly: it is always derived from date', async () => {
    const repository = new InMemoryDocumentRepository();
    await repository.save(buildDocument({ date: '2026-06-01', month: 6 }));
    const useCase = new UpdateDocumentUseCase(repository, new FakeSupplierExistenceChecker(new Set()));

    const updated = await useCase.execute({ id: 'doc-1', direction: 'ingreso' });

    expect(updated.getMonth()).toBe(6);
  });

  it('sets an optional field to null when the command explicitly carries null', async () => {
    const repository = new InMemoryDocumentRepository();
    await repository.save(buildDocument({ invoiceNumber: 'INV-1' }));
    const useCase = new UpdateDocumentUseCase(repository, new FakeSupplierExistenceChecker(new Set()));

    const updated = await useCase.execute({ id: 'doc-1', invoiceNumber: null });

    expect(updated.getInvoiceNumber()).toBeNull();
  });

  it('leaves an optional field untouched when it is not present in the command', async () => {
    const repository = new InMemoryDocumentRepository();
    await repository.save(buildDocument({ invoiceNumber: 'INV-1' }));
    const useCase = new UpdateDocumentUseCase(repository, new FakeSupplierExistenceChecker(new Set()));

    const updated = await useCase.execute({ id: 'doc-1', direction: 'ingreso' });

    expect(updated.getInvoiceNumber()).toBe('INV-1');
  });

  it('throws DocumentNotFoundException when the document does not exist', async () => {
    const repository = new InMemoryDocumentRepository();
    const useCase = new UpdateDocumentUseCase(repository, new FakeSupplierExistenceChecker(new Set()));

    await expect(
      useCase.execute({ id: 'missing-id', direction: 'ingreso' }),
    ).rejects.toThrow(DocumentNotFoundException);
  });

  it('throws DocumentNotFoundException when the document belongs to another project', async () => {
    const repository = new InMemoryDocumentRepository();
    await repository.save(buildDocument({ projectId: 'project-1' }));
    const useCase = new UpdateDocumentUseCase(repository, new FakeSupplierExistenceChecker(new Set()));

    await expect(
      useCase.execute({ id: 'doc-1', projectId: 'project-2', direction: 'ingreso' }),
    ).rejects.toThrow(DocumentNotFoundException);

    expect((await repository.findById('doc-1'))?.getDirection()).toBe('gasto');
  });

  it('updates the document when it belongs to the requested project', async () => {
    const repository = new InMemoryDocumentRepository();
    await repository.save(buildDocument({ projectId: 'project-1' }));
    const useCase = new UpdateDocumentUseCase(repository, new FakeSupplierExistenceChecker(new Set()));

    const updated = await useCase.execute({ id: 'doc-1', projectId: 'project-1', direction: 'ingreso' });

    expect(updated.getDirection()).toBe('ingreso');
  });

  it('throws DocumentSupplierNotFoundException when supplierId does not exist', async () => {
    const repository = new InMemoryDocumentRepository();
    await repository.save(buildDocument());
    const useCase = new UpdateDocumentUseCase(repository, new FakeSupplierExistenceChecker(new Set()));

    await expect(
      useCase.execute({ id: 'doc-1', supplierId: 'missing-supplier' }),
    ).rejects.toThrow(DocumentSupplierNotFoundException);
  });

  it('assigns a supplier when it exists', async () => {
    const repository = new InMemoryDocumentRepository();
    await repository.save(buildDocument());
    const useCase = new UpdateDocumentUseCase(
      repository,
      new FakeSupplierExistenceChecker(new Set(['supplier-1'])),
    );

    const updated = await useCase.execute({ id: 'doc-1', supplierId: 'supplier-1' });

    expect(updated.getSupplierId()).toBe('supplier-1');
  });

  it('unassigns a supplier without checking existence when supplierId is null', async () => {
    const repository = new InMemoryDocumentRepository();
    await repository.save(buildDocument({ supplierId: 'supplier-1' }));
    const useCase = new UpdateDocumentUseCase(repository, new FakeSupplierExistenceChecker(new Set()));

    const updated = await useCase.execute({ id: 'doc-1', supplierId: null });

    expect(updated.getSupplierId()).toBeNull();
  });

  it('rejects a staffMemberId supplied by a JavaScript caller', async () => {
    const repository = new InMemoryDocumentRepository();
    await repository.save(buildDocument());
    const useCase = new UpdateDocumentUseCase(
      repository,
      new FakeSupplierExistenceChecker(new Set()),
    );

    await expect(
      useCase.execute({ id: 'doc-1', staffMemberId: 'staff-1' } as unknown as UpdateDocumentCommand),
    ).rejects.toThrow(InvalidValueException);
  });

  it('keeps the existing staffMemberId of a nomina when the command omits it', async () => {
    const repository = new InMemoryDocumentRepository();
    await repository.save(
      buildDocument({ type: 'nomina', direction: 'gasto', staffMemberId: 'staff-1' }),
    );
    const useCase = new UpdateDocumentUseCase(
      repository,
      new FakeSupplierExistenceChecker(new Set()),
    );

    const updated = await useCase.execute({ id: 'doc-1', amount: 2200 });

    expect(updated.getStaffMemberId()).toBe('staff-1');
    expect(updated.getAmount()).toBe(2200);
  });

  it('rejects a type change for a historic nomina', async () => {
    const repository = new InMemoryDocumentRepository();
    await repository.save(
      buildDocument({ type: 'nomina', direction: 'gasto', staffMemberId: 'staff-1' }),
    );
    const useCase = new UpdateDocumentUseCase(
      repository,
      new FakeSupplierExistenceChecker(new Set()),
    );

    await expect(useCase.execute({ id: 'doc-1', type: 'factura' })).rejects.toThrow(
      InvalidValueException,
    );
  });

  it('rejects an explicit nomina type for an existing invoice', async () => {
    const repository = new InMemoryDocumentRepository();
    await repository.save(buildDocument());
    const useCase = new UpdateDocumentUseCase(
      repository,
      new FakeSupplierExistenceChecker(new Set()),
    );

    await expect(
      useCase.execute({ id: 'doc-1', type: 'nomina' } as unknown as UpdateDocumentCommand),
    ).rejects.toThrow(InvalidValueException);
  });

  it('rejects a negative amount', async () => {
    const repository = new InMemoryDocumentRepository();
    await repository.save(buildDocument());
    const useCase = new UpdateDocumentUseCase(repository, new FakeSupplierExistenceChecker(new Set()));

    await expect(useCase.execute({ id: 'doc-1', amount: -1 })).rejects.toThrow(InvalidValueException);
  });
});
