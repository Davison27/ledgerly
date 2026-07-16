import { CreateDocumentUseCase } from './create-document.use-case';
import { DocumentRepository } from '../../domain/document.repository';
import { Document } from '../../domain/document';
import { ProjectExistenceChecker } from '../../domain/project-existence-checker.port';
import { SupplierExistenceChecker } from '../../domain/supplier-existence-checker.port';
import { DocumentProjectNotFoundException } from '../../domain/errors/document-project-not-found.exception';
import { DocumentSupplierNotFoundException } from '../../domain/errors/document-supplier-not-found.exception';
import { IdGenerator } from '../../../../shared/domain/id-generator.port';

class InMemoryDocumentRepository implements DocumentRepository {
  private documents: Document[] = [];

  findByProject(): Promise<Document[]> {
    return Promise.resolve([...this.documents]);
  }

  findById(id: string): Promise<Document | null> {
    return Promise.resolve(this.documents.find((document) => document.getId() === id) ?? null);
  }

  save(document: Document): Promise<void> {
    this.documents.push(document);
    return Promise.resolve();
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }

  saveContent(): Promise<void> {
    return Promise.resolve();
  }

  findContent(): Promise<Buffer | null> {
    return Promise.resolve(null);
  }
}

class FakeExistenceChecker implements ProjectExistenceChecker, SupplierExistenceChecker {
  constructor(private readonly existingIds: Set<string>) {}

  exists(id: string): Promise<boolean> {
    return Promise.resolve(this.existingIds.has(id));
  }
}

class SequentialIdGenerator implements IdGenerator {
  private nextId = 1;

  generate(): string {
    return `doc-${this.nextId++}`;
  }
}

const BASE_COMMAND = {
  projectId: 'project-1',
  name: 'Invoice',
  type: 'factura' as const,
  month: 6,
  date: '2026-06-01',
  amount: 100,
  status: 'pendiente' as const,
};

describe('CreateDocumentUseCase', () => {
  it('creates a document without a supplier and does not check supplier existence', async () => {
    const repository = new InMemoryDocumentRepository();
    const projectChecker = new FakeExistenceChecker(new Set(['project-1']));
    const supplierChecker = new FakeExistenceChecker(new Set());
    const useCase = new CreateDocumentUseCase(
      repository,
      projectChecker,
      supplierChecker,
      new SequentialIdGenerator(),
    );

    const document = await useCase.execute(BASE_COMMAND);

    expect(document.getSupplierId()).toBeNull();
  });

  it('creates a document with a supplier when it exists', async () => {
    const repository = new InMemoryDocumentRepository();
    const projectChecker = new FakeExistenceChecker(new Set(['project-1']));
    const supplierChecker = new FakeExistenceChecker(new Set(['supplier-1']));
    const useCase = new CreateDocumentUseCase(
      repository,
      projectChecker,
      supplierChecker,
      new SequentialIdGenerator(),
    );

    const document = await useCase.execute({ ...BASE_COMMAND, supplierId: 'supplier-1' });

    expect(document.getSupplierId()).toBe('supplier-1');
  });

  it('throws DocumentSupplierNotFoundException when the supplier does not exist', async () => {
    const repository = new InMemoryDocumentRepository();
    const projectChecker = new FakeExistenceChecker(new Set(['project-1']));
    const supplierChecker = new FakeExistenceChecker(new Set());
    const useCase = new CreateDocumentUseCase(
      repository,
      projectChecker,
      supplierChecker,
      new SequentialIdGenerator(),
    );

    await expect(
      useCase.execute({ ...BASE_COMMAND, supplierId: 'missing-supplier' }),
    ).rejects.toThrow(DocumentSupplierNotFoundException);
  });

  it('throws DocumentProjectNotFoundException before checking the supplier', async () => {
    const repository = new InMemoryDocumentRepository();
    const projectChecker = new FakeExistenceChecker(new Set());
    const supplierChecker = new FakeExistenceChecker(new Set(['supplier-1']));
    const useCase = new CreateDocumentUseCase(
      repository,
      projectChecker,
      supplierChecker,
      new SequentialIdGenerator(),
    );

    await expect(
      useCase.execute({ ...BASE_COMMAND, supplierId: 'supplier-1' }),
    ).rejects.toThrow(DocumentProjectNotFoundException);
  });
});
