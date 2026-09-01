import { CreateDocumentUseCase } from './create-document.use-case';
import { DocumentRepository } from '../../domain/document.repository';
import { Document } from '../../domain/document';
import { DocumentDashboardRow } from '../../domain/document-dashboard-row';
import { DocumentListRow } from '../../domain/document-list-row';
import { DocumentDuplicateRow } from '../../domain/document-duplicate-row';
import { ProjectExistenceChecker } from '../../domain/project-existence-checker.port';
import { SupplierExistenceChecker } from '../../domain/supplier-existence-checker.port';
import { DocumentProjectNotFoundException } from '../../domain/errors/document-project-not-found.exception';
import { DocumentSupplierNotFoundException } from '../../domain/errors/document-supplier-not-found.exception';
import { IdGenerator } from '../../../../shared/domain/id-generator.port';
import { InvalidValueException } from '../../../../shared/domain/invalid-value.exception';
import { DomainEvent } from '../../../../shared/domain/domain-event';
import { DomainEventPublisher } from '../../../../shared/domain/domain-event-publisher.port';
import { DocumentCreatedEvent } from '../../domain/events/document-created.event';

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

  delete(): Promise<boolean> {
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

class FakeDomainEventPublisher implements DomainEventPublisher {
  published: DomainEvent[] = [];

  publish(events: DomainEvent[]): Promise<void> {
    this.published.push(...events);
    return Promise.resolve();
  }

  register(): void {}
}

const BASE_COMMAND = {
  projectId: 'project-1',
  name: 'Invoice',
  type: 'factura' as const,
  month: 6,
  date: '2026-06-01',
  amount: 100,
  status: 'pendiente' as const,
  direction: 'gasto' as const,
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
      new FakeDomainEventPublisher(),
    );

    const document = await useCase.execute(BASE_COMMAND);

    expect(document.getSupplierId()).toBeNull();
  });

  it('publishes a DocumentCreatedEvent after saving the document', async () => {
    const repository = new InMemoryDocumentRepository();
    const projectChecker = new FakeExistenceChecker(new Set(['project-1']));
    const supplierChecker = new FakeExistenceChecker(new Set());
    const publisher = new FakeDomainEventPublisher();
    const useCase = new CreateDocumentUseCase(
      repository,
      projectChecker,
      supplierChecker,
      new SequentialIdGenerator(),
      publisher,
    );

    const document = await useCase.execute({ ...BASE_COMMAND, invoiceNumber: 'INV-1' });

    expect(publisher.published).toHaveLength(1);
    const [event] = publisher.published as DocumentCreatedEvent[];
    expect(event.name).toBe(DocumentCreatedEvent.EVENT_NAME);
    expect(event.documentId).toBe(document.getId());
    expect(event.projectId).toBe('project-1');
    expect(event.invoiceNumber).toBe('INV-1');
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
      new FakeDomainEventPublisher(),
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
      new FakeDomainEventPublisher(),
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
      new FakeDomainEventPublisher(),
    );

    await expect(
      useCase.execute({ ...BASE_COMMAND, supplierId: 'supplier-1' }),
    ).rejects.toThrow(DocumentProjectNotFoundException);
  });

  it('persists the direction and IRPF fields that arrive in the command', async () => {
    const repository = new InMemoryDocumentRepository();
    const projectChecker = new FakeExistenceChecker(new Set(['project-1']));
    const supplierChecker = new FakeExistenceChecker(new Set());
    const useCase = new CreateDocumentUseCase(
      repository,
      projectChecker,
      supplierChecker,
      new SequentialIdGenerator(),
      new FakeDomainEventPublisher(),
    );

    const document = await useCase.execute({
      ...BASE_COMMAND,
      direction: 'ingreso',
      irpfRate: 15,
      irpfAmount: 150,
    });

    expect(document.getDirection()).toBe('ingreso');
    expect(document.getIrpfRate()).toBe(15);
    expect(document.getIrpfAmount()).toBe(150);
  });

  it('rejects a negative irpfRate', async () => {
    const repository = new InMemoryDocumentRepository();
    const projectChecker = new FakeExistenceChecker(new Set(['project-1']));
    const supplierChecker = new FakeExistenceChecker(new Set());
    const useCase = new CreateDocumentUseCase(
      repository,
      projectChecker,
      supplierChecker,
      new SequentialIdGenerator(),
      new FakeDomainEventPublisher(),
    );

    await expect(
      useCase.execute({ ...BASE_COMMAND, irpfRate: -1 }),
    ).rejects.toThrow(InvalidValueException);
  });

  it('rejects nomina creation before checking the project', async () => {
    const repository = new InMemoryDocumentRepository();
    const projectChecker = new FakeExistenceChecker(new Set());
    const supplierChecker = new FakeExistenceChecker(new Set());
    const useCase = new CreateDocumentUseCase(
      repository,
      projectChecker,
      supplierChecker,
      new SequentialIdGenerator(),
      new FakeDomainEventPublisher(),
    );

    await expect(
      useCase.execute({ ...BASE_COMMAND, type: 'nomina' } as unknown as typeof BASE_COMMAND),
    ).rejects.toThrow(InvalidValueException);
  });

  it('rejects a staffMemberId supplied by a JavaScript caller', async () => {
    const repository = new InMemoryDocumentRepository();
    const projectChecker = new FakeExistenceChecker(new Set(['project-1']));
    const supplierChecker = new FakeExistenceChecker(new Set());
    const useCase = new CreateDocumentUseCase(
      repository,
      projectChecker,
      supplierChecker,
      new SequentialIdGenerator(),
      new FakeDomainEventPublisher(),
    );

    await expect(
      useCase.execute({ ...BASE_COMMAND, staffMemberId: 'staff-1' } as unknown as typeof BASE_COMMAND),
    ).rejects.toThrow(InvalidValueException);
  });

  it('rejects an invalid direction', async () => {
    const repository = new InMemoryDocumentRepository();
    const projectChecker = new FakeExistenceChecker(new Set(['project-1']));
    const supplierChecker = new FakeExistenceChecker(new Set());
    const useCase = new CreateDocumentUseCase(
      repository,
      projectChecker,
      supplierChecker,
      new SequentialIdGenerator(),
      new FakeDomainEventPublisher(),
    );

    await expect(
      useCase.execute({ ...BASE_COMMAND, direction: 'otro' as unknown as 'ingreso' | 'gasto' }),
    ).rejects.toThrow(InvalidValueException);
  });
});
