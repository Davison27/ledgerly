import { DeleteStaffDocumentUseCase } from './delete-staff-document.use-case';
import { StaffDocumentRepository } from '../../domain/staff-document.repository';
import { StaffDocument } from '../../domain/staff-document';
import { StaffDocumentNotFoundException } from '../../domain/errors/staff-document-not-found.exception';

class InMemoryStaffDocumentRepository implements StaffDocumentRepository {
  private documents: StaffDocument[];

  constructor(documents: StaffDocument[]) {
    this.documents = documents;
  }

  findByStaffMember(staffMemberId: string): Promise<StaffDocument[]> {
    return Promise.resolve(
      this.documents.filter((document) => document.getStaffMemberId() === staffMemberId),
    );
  }

  findById(id: string, staffMemberId?: string): Promise<StaffDocument | null> {
    return Promise.resolve(
      this.documents.find(
        (document) =>
          document.getId() === id &&
          (staffMemberId === undefined || document.getStaffMemberId() === staffMemberId),
      ) ?? null,
    );
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  delete(id: string, staffMemberId?: string): Promise<boolean> {
    const document = this.documents.find(
      (candidate) =>
        candidate.getId() === id &&
        (staffMemberId === undefined || candidate.getStaffMemberId() === staffMemberId),
    );
    if (!document) {
      return Promise.resolve(false);
    }
    this.documents = this.documents.filter((candidate) => candidate.getId() !== id);
    return Promise.resolve(true);
  }

  saveContent(): Promise<void> {
    return Promise.resolve();
  }

  findContent(): Promise<Buffer | null> {
    return Promise.resolve(null);
  }
}

function buildDocument(): StaffDocument {
  return StaffDocument.create({
    id: 'staff-doc-1',
    staffMemberId: 'staff-1',
    typeId: 'type-dni',
    name: 'DNI Ana García',
    issueDate: '2024-01-10',
    fileName: 'dni.pdf',
    mimeType: 'application/pdf',
    fileSize: 4,
  });
}

describe('DeleteStaffDocumentUseCase', () => {
  it('throws StaffDocumentNotFoundException when the document belongs to another staff member', async () => {
    const repository = new InMemoryStaffDocumentRepository([buildDocument()]);
    const useCase = new DeleteStaffDocumentUseCase(repository);

    await expect(useCase.execute('staff-doc-1', 'staff-2')).rejects.toThrow(
      StaffDocumentNotFoundException,
    );

    expect(await repository.findById('staff-doc-1')).not.toBeNull();
  });

  it('deletes the document when it belongs to the requested staff member', async () => {
    const repository = new InMemoryStaffDocumentRepository([buildDocument()]);
    const useCase = new DeleteStaffDocumentUseCase(repository);

    await useCase.execute('staff-doc-1', 'staff-1');

    expect(await repository.findById('staff-doc-1')).toBeNull();
  });
});
