import { CheckDocumentDuplicateUseCase } from './check-document-duplicate.use-case';
import { DocumentRepository } from '../../domain/document.repository';
import { DocumentDuplicateRow } from '../../domain/document-duplicate-row';
import { DocumentDuplicateCriteria } from '../../domain/document-duplicate-criteria';
import { Document } from '../../domain/document';
import { DocumentDashboardRow } from '../../domain/document-dashboard-row';
import { DocumentListRow } from '../../domain/document-list-row';
import {
  ProjectNameProvider,
  ProjectNameSummary,
} from '../../domain/project-name-provider.port';

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

  delete(): Promise<boolean> {
    return Promise.resolve(true);
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

function buildSummary(overrides: Partial<ProjectNameSummary> = {}): ProjectNameSummary {
  return {
    id: 'project-1',
    name: 'Project One',
    ...overrides,
  };
}

describe('CheckDocumentDuplicateUseCase', () => {
  it('matches when the issuer tax id equals after normalisation', async () => {
    const documentRepository = new FakeDocumentRepository([
      buildCandidate({ issuerTaxId: 'B-12345678' }),
    ]);
    const projectNameProvider = new FakeProjectNameProvider([buildSummary()]);
    const useCase = new CheckDocumentDuplicateUseCase(documentRepository, projectNameProvider);

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
    const projectNameProvider = new FakeProjectNameProvider([buildSummary()]);
    const useCase = new CheckDocumentDuplicateUseCase(documentRepository, projectNameProvider);

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
    const projectNameProvider = new FakeProjectNameProvider([buildSummary()]);
    const useCase = new CheckDocumentDuplicateUseCase(documentRepository, projectNameProvider);

    const result = await useCase.execute({ invoiceNumber: 'INV-1', amount: 100 });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('doc-1');
  });

  it('returns no matches when an issuer field is provided but neither tax id nor name align', async () => {
    const documentRepository = new FakeDocumentRepository([
      buildCandidate({ issuerTaxId: 'B99999999', issuerName: 'Other SL' }),
    ]);
    const projectNameProvider = new FakeProjectNameProvider([buildSummary()]);
    const useCase = new CheckDocumentDuplicateUseCase(documentRepository, projectNameProvider);

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
    const projectNameProvider = new FakeProjectNameProvider([]);
    const useCase = new CheckDocumentDuplicateUseCase(documentRepository, projectNameProvider);

    const result = await useCase.execute({ invoiceNumber: 'INV-404', amount: 50 });

    expect(result).toEqual([]);
  });

  it('forwards the query criteria to the repository', async () => {
    const documentRepository = new FakeDocumentRepository([]);
    const projectNameProvider = new FakeProjectNameProvider([]);
    const useCase = new CheckDocumentDuplicateUseCase(documentRepository, projectNameProvider);

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
