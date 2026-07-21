import { UpdateStaffDocumentUseCase } from './update-staff-document.use-case';
import { StaffDocumentRepository } from '../../domain/staff-document.repository';
import { StaffDocument } from '../../domain/staff-document';
import { StaffDocumentNotFoundException } from '../../domain/errors/staff-document-not-found.exception';
import { InvalidValueException } from '../../../../shared/domain/invalid-value.exception';

class InMemoryStaffDocumentRepository implements StaffDocumentRepository {
  private documents: StaffDocument[] = [];

  constructor(initial: StaffDocument[] = []) {
    this.documents = initial;
  }

  findByStaffMember(staffMemberId: string): Promise<StaffDocument[]> {
    return Promise.resolve(
      this.documents.filter((document) => document.getStaffMemberId() === staffMemberId),
    );
  }

  findById(id: string): Promise<StaffDocument | null> {
    return Promise.resolve(this.documents.find((document) => document.getId() === id) ?? null);
  }

  save(staffDocument: StaffDocument): Promise<void> {
    const index = this.documents.findIndex((existing) => existing.getId() === staffDocument.getId());

    if (index === -1) {
      this.documents.push(staffDocument);
    } else {
      this.documents[index] = staffDocument;
    }

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

function buildDocument(): StaffDocument {
  return StaffDocument.create({
    id: 'staff-doc-1',
    staffMemberId: 'staff-1',
    typeId: 'type-dni',
    name: 'DNI Ana García',
    issueDate: '2024-01-10',
    expiryDate: '2030-01-10',
    notes: null,
    fileName: 'dni.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024,
  });
}

describe('UpdateStaffDocumentUseCase', () => {
  it('updates only the fields present in the command', async () => {
    const repository = new InMemoryStaffDocumentRepository([buildDocument()]);
    const useCase = new UpdateStaffDocumentUseCase(repository);

    const updated = await useCase.execute({ id: 'staff-doc-1', name: 'DNI renovado' });

    expect(updated.getName()).toBe('DNI renovado');
    expect(updated.getFileName()).toBe('dni.pdf');
    expect(updated.getExpiryDate()).toBe('2030-01-10');
  });

  it('leaves fields not present in the command untouched', async () => {
    const repository = new InMemoryStaffDocumentRepository([buildDocument()]);
    const useCase = new UpdateStaffDocumentUseCase(repository);

    const updated = await useCase.execute({ id: 'staff-doc-1', notes: 'Copia compulsada' });

    expect(updated.getNotes()).toBe('Copia compulsada');
    expect(updated.getName()).toBe('DNI Ana García');
  });

  it('sets expiryDate to null when the command explicitly carries null', async () => {
    const repository = new InMemoryStaffDocumentRepository([buildDocument()]);
    const useCase = new UpdateStaffDocumentUseCase(repository);

    const updated = await useCase.execute({ id: 'staff-doc-1', expiryDate: null });

    expect(updated.getExpiryDate()).toBeNull();
  });

  it('throws StaffDocumentNotFoundException when the document does not exist', async () => {
    const repository = new InMemoryStaffDocumentRepository();
    const useCase = new UpdateStaffDocumentUseCase(repository);

    await expect(useCase.execute({ id: 'missing-id', name: 'x' })).rejects.toThrow(
      StaffDocumentNotFoundException,
    );
  });

  it('throws InvalidValueException when the update leaves expiryDate before issueDate', async () => {
    const repository = new InMemoryStaffDocumentRepository([buildDocument()]);
    const useCase = new UpdateStaffDocumentUseCase(repository);

    await expect(
      useCase.execute({ id: 'staff-doc-1', expiryDate: '2020-01-01' }),
    ).rejects.toThrow(InvalidValueException);
  });
});
