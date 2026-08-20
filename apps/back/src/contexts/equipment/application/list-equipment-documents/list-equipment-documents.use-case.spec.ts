import { Equipment } from '../../domain/equipment';
import { EquipmentDocument } from '../../domain/equipment-document';
import { EquipmentDocumentRepository } from '../../domain/equipment-document.repository';
import { EquipmentRepository } from '../../domain/equipment.repository';
import { EquipmentNotFoundException } from '../../domain/errors/equipment-not-found.exception';
import { ListEquipmentDocumentsUseCase } from './list-equipment-documents.use-case';

class FakeEquipmentDocumentRepository implements EquipmentDocumentRepository {
  constructor(private readonly documents: EquipmentDocument[]) {}

  findByEquipment(equipmentId: string): Promise<EquipmentDocument[]> {
    return Promise.resolve(this.documents.filter((document) => document.getEquipmentId() === equipmentId));
  }

  findById(): Promise<EquipmentDocument | null> {
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

class FakeEquipmentRepository implements EquipmentRepository {
  constructor(private readonly equipment: Equipment | null) {}

  findAll(): Promise<Equipment[]> {
    return Promise.resolve(this.equipment === null ? [] : [this.equipment]);
  }

  findById(): Promise<Equipment | null> {
    return Promise.resolve(this.equipment);
  }

  findByName(): Promise<Equipment | null> {
    return Promise.resolve(null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }
}

function buildDocument(): EquipmentDocument {
  return EquipmentDocument.create({
    id: 'equipment-document-1',
    equipmentId: 'equipment-1',
    name: 'Inspection report',
    issueDate: null,
    expiryDate: null,
    notes: null,
    fileName: 'inspection.pdf',
    mimeType: 'application/pdf',
    fileSize: 5,
  });
}

function buildEquipment(): Equipment {
  return Equipment.create({ id: 'equipment-1', name: 'Forklift', price: null, stock: 1 });
}

describe('ListEquipmentDocumentsUseCase', () => {
  it('checks that the equipment exists before listing its documents', async () => {
    const useCase = new ListEquipmentDocumentsUseCase(
      new FakeEquipmentDocumentRepository([buildDocument()]),
      new FakeEquipmentRepository(buildEquipment()),
    );

    await expect(useCase.execute('equipment-1')).resolves.toHaveLength(1);
  });

  it('throws EquipmentNotFoundException before querying documents for unknown equipment', async () => {
    const repository = new FakeEquipmentDocumentRepository([buildDocument()]);
    const useCase = new ListEquipmentDocumentsUseCase(repository, new FakeEquipmentRepository(null));

    await expect(useCase.execute('missing-equipment')).rejects.toThrow(EquipmentNotFoundException);
  });
});
