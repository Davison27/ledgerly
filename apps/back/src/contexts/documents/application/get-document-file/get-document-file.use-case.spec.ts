import { GetDocumentFileUseCase } from './get-document-file.use-case';
import { DocumentRepository } from '../../domain/document.repository';
import { Document } from '../../domain/document';
import { DocumentDashboardRow } from '../../domain/document-dashboard-row';
import { DocumentListRow } from '../../domain/document-list-row';
import { DocumentDuplicateRow } from '../../domain/document-duplicate-row';
import { DocumentNotFoundException } from '../../domain/errors/document-not-found.exception';

class InMemoryDocumentRepository implements DocumentRepository {
  constructor(
    private readonly documents: Document[],
    private readonly contents: Map<string, Buffer>,
  ) {}

  findByProject(): Promise<Document[]> {
    return Promise.resolve([...this.documents]);
  }

  findById(id: string): Promise<Document | null> {
    return Promise.resolve(this.documents.find((document) => document.getId() === id) ?? null);
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

  findContent(id: string): Promise<Buffer | null> {
    return Promise.resolve(this.contents.get(id) ?? null);
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
    fileName: 'invoice.pdf',
    mimeType: 'application/pdf',
    fileSize: 4,
  });
}

describe('GetDocumentFileUseCase', () => {
  it('throws DocumentNotFoundException when the document belongs to another project', async () => {
    const useCase = new GetDocumentFileUseCase(
      new InMemoryDocumentRepository([buildDocument()], new Map([['doc-1', Buffer.from('file')]])),
    );

    await expect(useCase.execute('doc-1', 'project-2')).rejects.toThrow(DocumentNotFoundException);
  });

  it('returns the file when the document belongs to the requested project', async () => {
    const useCase = new GetDocumentFileUseCase(
      new InMemoryDocumentRepository([buildDocument()], new Map([['doc-1', Buffer.from('file')]])),
    );

    const file = await useCase.execute('doc-1', 'project-1');

    expect(file?.content).toEqual(Buffer.from('file'));
  });
});
