import { GetDocumentUseCase } from './get-document.use-case';
import { DocumentRepository } from '../../domain/document.repository';
import { Document } from '../../domain/document';
import { DocumentDashboardRow } from '../../domain/document-dashboard-row';
import { DocumentListRow } from '../../domain/document-list-row';
import { DocumentDuplicateRow } from '../../domain/document-duplicate-row';
import { DocumentNotFoundException } from '../../domain/errors/document-not-found.exception';

class InMemoryDocumentRepository implements DocumentRepository {
  constructor(private readonly documents: Document[]) {}

  findByProject(): Promise<Document[]> {
    return Promise.resolve([...this.documents]);
  }

  findById(id: string): Promise<Document | null> {
    return Promise.resolve(this.documents.find((document) => document.getId() === id) ?? null);
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

function buildDocument(): Document {
  return Document.create({
    id: 'doc-1',
    projectId: 'project-1',
    name: 'Invoice',
    type: 'factura',
    month: 6,
    date: '2026-06-01',
    amount: 100,
    status: 'pendiente',
    direction: 'gasto',
  });
}

describe('GetDocumentUseCase', () => {
  it('throws DocumentNotFoundException when the document belongs to another project', async () => {
    const useCase = new GetDocumentUseCase(new InMemoryDocumentRepository([buildDocument()]));

    await expect(useCase.execute('doc-1', 'project-2')).rejects.toThrow(DocumentNotFoundException);
  });

  it('returns the document when it belongs to the requested project', async () => {
    const useCase = new GetDocumentUseCase(new InMemoryDocumentRepository([buildDocument()]));

    const document = await useCase.execute('doc-1', 'project-1');

    expect(document.getId()).toBe('doc-1');
  });
});
