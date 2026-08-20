import { GetStaffDocumentFileUseCase } from './get-staff-document-file.use-case';
import { StaffDocumentRepository } from '../../domain/staff-document.repository';
import { StaffDocument } from '../../domain/staff-document';
import { StaffDocumentNotFoundException } from '../../domain/errors/staff-document-not-found.exception';

class InMemoryStaffDocumentRepository implements StaffDocumentRepository {
  constructor(
    private readonly documents: StaffDocument[],
    private readonly contents: Map<string, Buffer>,
  ) {}

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

  delete(): Promise<boolean> {
    return Promise.resolve(true);
  }

  saveContent(): Promise<void> {
    return Promise.resolve();
  }

  findContent(id: string, staffMemberId?: string): Promise<Buffer | null> {
    const document = this.documents.find(
      (candidate) =>
        candidate.getId() === id &&
        (staffMemberId === undefined || candidate.getStaffMemberId() === staffMemberId),
    );

    if (!document) {
      return Promise.resolve(null);
    }

    return Promise.resolve(this.contents.get(id) ?? null);
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

describe('GetStaffDocumentFileUseCase', () => {
  it('throws StaffDocumentNotFoundException when the document belongs to another staff member', async () => {
    const useCase = new GetStaffDocumentFileUseCase(
      new InMemoryStaffDocumentRepository([buildDocument()], new Map([['staff-doc-1', Buffer.from('file')]])),
    );

    await expect(useCase.execute('staff-doc-1', 'staff-2')).rejects.toThrow(
      StaffDocumentNotFoundException,
    );
  });

  it('does not return file bytes when the route parent does not own the document', async () => {
    const content = Buffer.from('file');
    const useCase = new GetStaffDocumentFileUseCase(
      new InMemoryStaffDocumentRepository([buildDocument()], new Map([['staff-doc-1', content]])),
    );

    await expect(useCase.execute('staff-doc-1', 'staff-2')).rejects.toThrow(
      StaffDocumentNotFoundException,
    );
  });

  it('returns the file when the document belongs to the requested staff member', async () => {
    const useCase = new GetStaffDocumentFileUseCase(
      new InMemoryStaffDocumentRepository([buildDocument()], new Map([['staff-doc-1', Buffer.from('file')]])),
    );

    const file = await useCase.execute('staff-doc-1', 'staff-1');

    expect(file?.content).toEqual(Buffer.from('file'));
  });
});
