import { DeleteDocumentUseCase } from './delete-document.use-case';
import { DocumentRepository } from '../../domain/document.repository';
import { Document } from '../../domain/document';
import { DocumentDashboardRow } from '../../domain/document-dashboard-row';
import { DocumentListRow } from '../../domain/document-list-row';
import { DocumentDuplicateRow } from '../../domain/document-duplicate-row';
import { DocumentNotFoundException } from '../../domain/errors/document-not-found.exception';

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

  delete(id: string): Promise<void> {
    this.documents = this.documents.filter((document) => document.getId() !== id);
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

function buildDocument(id = 'doc-1'): Document {
  return Document.create({
    id,
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

describe('DeleteDocumentUseCase', () => {
  it('deletes an existing document', async () => {
    const repository = new InMemoryDocumentRepository();
    await repository.save(buildDocument());
    const useCase = new DeleteDocumentUseCase(repository);

    await useCase.execute('doc-1');

    expect(await repository.findById('doc-1')).toBeNull();
  });

  it('throws DocumentNotFoundException when the document does not exist', async () => {
    const repository = new InMemoryDocumentRepository();
    const useCase = new DeleteDocumentUseCase(repository);

    await expect(useCase.execute('missing-id')).rejects.toThrow(DocumentNotFoundException);
  });
});
