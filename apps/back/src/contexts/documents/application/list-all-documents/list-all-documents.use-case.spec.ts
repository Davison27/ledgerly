import { ListAllDocumentsUseCase } from './list-all-documents.use-case';
import { DocumentRepository } from '../../domain/document.repository';
import { DocumentListRow } from '../../domain/document-list-row';
import { DocumentListFilters } from '../../domain/document-list-filters';
import { Document } from '../../domain/document';
import { DocumentDashboardRow } from '../../domain/document-dashboard-row';
import { DocumentDuplicateRow } from '../../domain/document-duplicate-row';
import {
  ProjectNameProvider,
  ProjectNameSummary,
} from '../../domain/project-name-provider.port';

class FakeDocumentRepository implements DocumentRepository {
  public receivedFilters: DocumentListFilters | undefined;

  constructor(private readonly rows: DocumentListRow[]) {}

  findAllForListing(filters: DocumentListFilters): Promise<DocumentListRow[]> {
    this.receivedFilters = filters;
    return Promise.resolve(this.rows);
  }

  findAllForDashboard(): Promise<DocumentDashboardRow[]> {
    return Promise.resolve([]);
  }

  findPossibleDuplicates(): Promise<DocumentDuplicateRow[]> {
    return Promise.resolve([]);
  }

  findByProject(): Promise<Document[]> {
    return Promise.resolve([]);
  }

  findById(): Promise<Document | null> {
    return Promise.resolve(null);
  }

  save(): Promise<void> {
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

class FakeProjectNameProvider implements ProjectNameProvider {
  constructor(private readonly names: ProjectNameSummary[]) {}

  findAllNames(): Promise<ProjectNameSummary[]> {
    return Promise.resolve(this.names);
  }
}

function buildRow(overrides: Partial<DocumentListRow> = {}): DocumentListRow {
  return {
    id: 'doc-1',
    projectId: 'project-1',
    name: 'Invoice 1',
    type: 'factura',
    status: 'pendiente',
    direction: 'gasto',
    date: '2026-06-15',
    dueDate: null,
    amount: 100,
    currency: 'EUR',
    issuerName: 'Acme SL',
    invoiceNumber: 'INV-1',
    supplierId: null,
    staffMemberId: null,
    ...overrides,
  };
}

function buildSummary(overrides: Partial<ProjectNameSummary> = {}): ProjectNameSummary {
  return {
    id: 'project-1',
    name: 'Project One',
    ...overrides,
  };
}

describe('ListAllDocumentsUseCase', () => {
  it('attaches the project name resolved via the project name provider', async () => {
    const documentRepository = new FakeDocumentRepository([buildRow({ projectId: 'project-1' })]);
    const projectNameProvider = new FakeProjectNameProvider([
      buildSummary({ id: 'project-1', name: 'Project One' }),
    ]);
    const useCase = new ListAllDocumentsUseCase(documentRepository, projectNameProvider);

    const result = await useCase.execute({});

    expect(result).toEqual([
      expect.objectContaining({ id: 'doc-1', projectId: 'project-1', projectName: 'Project One' }),
    ]);
  });

  it('falls back to an empty project name when the project is unknown', async () => {
    const documentRepository = new FakeDocumentRepository([buildRow({ projectId: 'missing-project' })]);
    const projectNameProvider = new FakeProjectNameProvider([]);
    const useCase = new ListAllDocumentsUseCase(documentRepository, projectNameProvider);

    const result = await useCase.execute({});

    expect(result[0].projectName).toBe('');
  });

  it('forwards filters, including projectId and supplierId, to the repository', async () => {
    const documentRepository = new FakeDocumentRepository([]);
    const projectNameProvider = new FakeProjectNameProvider([]);
    const useCase = new ListAllDocumentsUseCase(documentRepository, projectNameProvider);

    const filters: DocumentListFilters = {
      search: 'invoice',
      type: 'factura',
      status: 'pendiente',
      direction: 'ingreso',
      dateFrom: '2026-01-01',
      dateTo: '2026-12-31',
      amountMin: 10,
      amountMax: 1000,
      projectId: 'project-1',
      supplierId: 'supplier-1',
    };

    await useCase.execute(filters);

    expect(documentRepository.receivedFilters).toEqual(filters);
  });

  it('preserves the date-descending order returned by the repository', async () => {
    const documentRepository = new FakeDocumentRepository([
      buildRow({ id: 'doc-newest', date: '2026-06-15' }),
      buildRow({ id: 'doc-middle', date: '2026-03-01' }),
      buildRow({ id: 'doc-oldest', date: '2026-01-10' }),
    ]);
    const projectNameProvider = new FakeProjectNameProvider([buildSummary()]);
    const useCase = new ListAllDocumentsUseCase(documentRepository, projectNameProvider);

    const result = await useCase.execute({});

    expect(result.map((item) => item.id)).toEqual(['doc-newest', 'doc-middle', 'doc-oldest']);
  });

  it('maps every listing field onto the returned list item', async () => {
    const documentRepository = new FakeDocumentRepository([
      buildRow({
        id: 'doc-2',
        projectId: 'project-1',
        name: 'Invoice 2',
        type: 'nomina',
        status: 'pagado',
        direction: 'ingreso',
        date: '2026-05-01',
        dueDate: '2026-05-20',
        amount: 250.5,
        currency: 'USD',
        issuerName: 'Beta SL',
        invoiceNumber: 'INV-2',
        supplierId: 'supplier-1',
        staffMemberId: 'staff-1',
      }),
    ]);
    const projectNameProvider = new FakeProjectNameProvider([
      buildSummary({ id: 'project-1', name: 'Project One' }),
    ]);
    const useCase = new ListAllDocumentsUseCase(documentRepository, projectNameProvider);

    const result = await useCase.execute({});

    expect(result).toEqual([
      {
        id: 'doc-2',
        projectId: 'project-1',
        projectName: 'Project One',
        name: 'Invoice 2',
        type: 'nomina',
        status: 'pagado',
        direction: 'ingreso',
        date: '2026-05-01',
        dueDate: '2026-05-20',
        amount: 250.5,
        currency: 'USD',
        issuerName: 'Beta SL',
        invoiceNumber: 'INV-2',
        supplierId: 'supplier-1',
        staffMemberId: 'staff-1',
      },
    ]);
  });
});
