import { CheckDocumentDuplicateUseCase } from './check-document-duplicate.use-case';
import { DocumentRepository } from '../../domain/document.repository';
import { DocumentDuplicateRow } from '../../domain/document-duplicate-row';
import { DocumentDuplicateCriteria } from '../../domain/document-duplicate-criteria';
import { Document } from '../../domain/document';
import { DocumentDashboardRow } from '../../domain/document-dashboard-row';
import { DocumentListRow } from '../../domain/document-list-row';
import {
  ProjectDashboardRow,
  ProjectRepository,
} from '../../../projects/domain/project.repository';
import { ProjectSummary } from '../../../projects/domain/project-summary';
import { Project } from '../../../projects/domain/project';

class FakeDocumentRepository implements DocumentRepository {
  public receivedCriteria: DocumentDuplicateCriteria | undefined;

  constructor(private readonly rows: DocumentDuplicateRow[]) {}

  findPossibleDuplicates(criteria: DocumentDuplicateCriteria): Promise<DocumentDuplicateRow[]> {
    this.receivedCriteria = criteria;
    return Promise.resolve(this.rows);
  }

  findAllForListing(): Promise<DocumentListRow[]> {
    return Promise.resolve([]);
  }

  findAllForDashboard(): Promise<DocumentDashboardRow[]> {
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

class FakeProjectRepository implements ProjectRepository {
  constructor(private readonly summaries: ProjectSummary[]) {}

  findAllSummaries(): Promise<ProjectSummary[]> {
    return Promise.resolve(this.summaries);
  }

  findSummaryById(): Promise<ProjectSummary | null> {
    return Promise.resolve(null);
  }

  findById(): Promise<Project | null> {
    return Promise.resolve(null);
  }

  findByCode(): Promise<Project | null> {
    return Promise.resolve(null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }

  findAllForDashboard(): Promise<ProjectDashboardRow[]> {
    return Promise.resolve([]);
  }
}

function buildCandidate(overrides: Partial<DocumentDuplicateRow> = {}): DocumentDuplicateRow {
  return {
    id: 'doc-1',
    projectId: 'project-1',
    name: 'Invoice 1',
    date: '2026-06-15',
    amount: 100,
    issuerName: 'Acme SL',
    issuerTaxId: 'B12345678',
    invoiceNumber: 'INV-1',
    ...overrides,
  };
}

function buildSummary(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: 'project-1',
    name: 'Project One',
    code: 'P1',
    documentCount: 0,
    pendingCount: 0,
    image: null,
    ...overrides,
  };
}

describe('CheckDocumentDuplicateUseCase', () => {
  it('matches when the issuer tax id equals after normalisation', async () => {
    const documentRepository = new FakeDocumentRepository([
      buildCandidate({ issuerTaxId: 'B-12345678' }),
    ]);
    const projectRepository = new FakeProjectRepository([buildSummary()]);
    const useCase = new CheckDocumentDuplicateUseCase(documentRepository, projectRepository);

    const result = await useCase.execute({
      issuerTaxId: 'b12345678',
      invoiceNumber: 'INV-1',
      amount: 100,
    });

    expect(result).toEqual([
      {
        id: 'doc-1',
        projectId: 'project-1',
        projectName: 'Project One',
        name: 'Invoice 1',
        date: '2026-06-15',
        amount: 100,
      },
    ]);
  });

  it('matches when the issuer name equals after normalisation', async () => {
    const documentRepository = new FakeDocumentRepository([
      buildCandidate({ issuerTaxId: null, issuerName: 'Acme  SL' }),
    ]);
    const projectRepository = new FakeProjectRepository([buildSummary()]);
    const useCase = new CheckDocumentDuplicateUseCase(documentRepository, projectRepository);

    const result = await useCase.execute({
      issuerName: 'acme sl',
      invoiceNumber: 'INV-1',
      amount: 100,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('doc-1');
  });

  it('matches on invoiceNumber and amount only when neither issuer field is provided', async () => {
    const documentRepository = new FakeDocumentRepository([
      buildCandidate({ issuerName: null, issuerTaxId: null }),
    ]);
    const projectRepository = new FakeProjectRepository([buildSummary()]);
    const useCase = new CheckDocumentDuplicateUseCase(documentRepository, projectRepository);

    const result = await useCase.execute({ invoiceNumber: 'INV-1', amount: 100 });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('doc-1');
  });

  it('returns no matches when an issuer field is provided but neither tax id nor name align', async () => {
    const documentRepository = new FakeDocumentRepository([
      buildCandidate({ issuerTaxId: 'B99999999', issuerName: 'Other SL' }),
    ]);
    const projectRepository = new FakeProjectRepository([buildSummary()]);
    const useCase = new CheckDocumentDuplicateUseCase(documentRepository, projectRepository);

    const result = await useCase.execute({
      issuerTaxId: 'B12345678',
      issuerName: 'Acme SL',
      invoiceNumber: 'INV-1',
      amount: 100,
    });

    expect(result).toEqual([]);
  });

  it('returns an empty array when the repository finds no candidates', async () => {
    const documentRepository = new FakeDocumentRepository([]);
    const projectRepository = new FakeProjectRepository([]);
    const useCase = new CheckDocumentDuplicateUseCase(documentRepository, projectRepository);

    const result = await useCase.execute({ invoiceNumber: 'INV-404', amount: 50 });

    expect(result).toEqual([]);
  });

  it('forwards the query criteria to the repository', async () => {
    const documentRepository = new FakeDocumentRepository([]);
    const projectRepository = new FakeProjectRepository([]);
    const useCase = new CheckDocumentDuplicateUseCase(documentRepository, projectRepository);

    await useCase.execute({
      issuerName: 'Acme SL',
      issuerTaxId: 'B12345678',
      invoiceNumber: 'INV-1',
      amount: 100,
    });

    expect(documentRepository.receivedCriteria).toEqual({
      issuerName: 'Acme SL',
      issuerTaxId: 'B12345678',
      invoiceNumber: 'INV-1',
      amount: 100,
    });
  });
});
