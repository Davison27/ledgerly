import { EquipmentDocument } from '../../domain/equipment-document';
import { EquipmentDocumentRepository } from '../../domain/equipment-document.repository';
import { EquipmentDocumentNotFoundException } from '../../domain/errors/equipment-document-not-found.exception';
import { UpdateEquipmentDocumentUseCase } from './update-equipment-document.use-case';

class ScopedRepository implements EquipmentDocumentRepository {
  constructor(private document: EquipmentDocument | null) {}

  readonly findByIdCalls: Array<[string, string]> = [];

  findByEquipment(): Promise<EquipmentDocument[]> {
    return Promise.resolve(this.document === null ? [] : [this.document]);
  }

  findById(equipmentId: string, documentId: string): Promise<EquipmentDocument | null> {
    this.findByIdCalls.push([equipmentId, documentId]);
    return Promise.resolve(
      this.document?.getEquipmentId() === equipmentId && this.document.getId() === documentId ? this.document : null,
    );
  }

  save(document: EquipmentDocument): Promise<void> {
    this.document = document;
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

  current(): EquipmentDocument | null {
    return this.document;
  }
}

function buildDocument(): EquipmentDocument {
  return EquipmentDocument.create({
    id: 'equipment-document-1',
    equipmentId: 'equipment-1',
    name: 'Inspection report',
    issueDate: '2026-01-01',
    expiryDate: null,
    notes: null,
    fileName: 'inspection.pdf',
    mimeType: 'application/pdf',
    fileSize: 5,
  });
}

describe('UpdateEquipmentDocumentUseCase', () => {
  it('updates metadata while retaining the scoped file identity', async () => {
    const repository = new ScopedRepository(buildDocument());
    const useCase = new UpdateEquipmentDocumentUseCase(repository);

    const updated = await useCase.execute({
      equipmentId: 'equipment-1',
      documentId: 'equipment-document-1',
      name: 'Renewed inspection',
      notes: '2026',
    });

    expect(repository.findByIdCalls).toEqual([['equipment-1', 'equipment-document-1']]);
    expect(updated.getName()).toBe('Renewed inspection');
    expect(updated.getFileName()).toBe('inspection.pdf');
    expect(repository.current()?.getEquipmentId()).toBe('equipment-1');
  });

  it('returns a safe not-found result for a document belonging to another equipment', async () => {
    const repository = new ScopedRepository(buildDocument());
    const useCase = new UpdateEquipmentDocumentUseCase(repository);

    await expect(
      useCase.execute({ equipmentId: 'equipment-2', documentId: 'equipment-document-1', name: 'Hidden' }),
    ).rejects.toThrow(EquipmentDocumentNotFoundException);
  });
});
