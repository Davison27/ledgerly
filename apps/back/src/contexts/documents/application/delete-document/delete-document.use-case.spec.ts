import { DeleteDocumentUseCase } from './delete-document.use-case';
import { DocumentRepository } from '../../domain/document.repository';
import { Document } from '../../domain/document';
import { DocumentDashboardRow } from '../../domain/document-dashboard-row';
import { DocumentListRow } from '../../domain/document-list-row';
import { DocumentDuplicateRow } from '../../domain/document-duplicate-row';
import { DocumentNotFoundException } from '../../domain/errors/document-not-found.exception';
import { Clock } from '../../../../shared/domain/clock.port';

class InMemoryDocumentRepository implements DocumentRepository {
  private documents: Document[] = [];
  readonly softDeleteCalls: Array<{ id: string; deletedBy: string; deletedAt: Date }> = [];

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

  softDelete(id: string, deletedBy: string, deletedAt: Date): Promise<boolean> {
    const document = this.documents.find((candidate) => candidate.getId() === id);
    if (!document) {
      return Promise.resolve(false);
    }
    this.softDeleteCalls.push({ id, deletedBy, deletedAt });
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

class FixedClock implements Clock {
  constructor(private readonly currentTime: Date) {}

  now(): Date {
    return this.currentTime;
  }

  todayIso(): string {
    return '2026-06-15';
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
  it('soft deletes an existing document with the member and clock values', async () => {
    const repository = new InMemoryDocumentRepository();
    await repository.save(buildDocument());
    const deletedAt = new Date('2026-06-15T10:00:00.000Z');
    const useCase = new DeleteDocumentUseCase(repository, new FixedClock(deletedAt));

    await useCase.execute({ id: 'doc-1', projectId: 'project-1', deletedBy: 'member-1' });

    expect(await repository.findById('doc-1')).not.toBeNull();
    expect(repository.softDeleteCalls).toEqual([
      { id: 'doc-1', deletedBy: 'member-1', deletedAt },
    ]);
  });

  it('throws DocumentNotFoundException when the document does not exist', async () => {
    const repository = new InMemoryDocumentRepository();
    const useCase = new DeleteDocumentUseCase(repository, new FixedClock(new Date()));

    await expect(
      useCase.execute({ id: 'missing-id', projectId: 'project-1', deletedBy: 'member-1' }),
    ).rejects.toThrow(DocumentNotFoundException);
  });

  it('throws DocumentNotFoundException when the document belongs to another project', async () => {
    const repository = new InMemoryDocumentRepository();
    await repository.save(buildDocument());
    const useCase = new DeleteDocumentUseCase(repository, new FixedClock(new Date()));

    await expect(
      useCase.execute({ id: 'doc-1', projectId: 'project-2', deletedBy: 'member-1' }),
    ).rejects.toThrow(DocumentNotFoundException);

    expect(await repository.findById('doc-1')).not.toBeNull();
    expect(repository.softDeleteCalls).toEqual([]);
  });

  it('deletes the document when it belongs to the requested project', async () => {
    const repository = new InMemoryDocumentRepository();
    await repository.save(buildDocument());
    const useCase = new DeleteDocumentUseCase(repository, new FixedClock(new Date()));

    await useCase.execute({ id: 'doc-1', projectId: 'project-1', deletedBy: 'member-1' });

    expect(await repository.findById('doc-1')).not.toBeNull();
    expect(repository.softDeleteCalls).toHaveLength(1);
  });
});
