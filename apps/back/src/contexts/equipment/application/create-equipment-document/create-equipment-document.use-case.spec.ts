import { IdGenerator } from '../../../../shared/domain/id-generator.port';
import { Equipment } from '../../domain/equipment';
import { EquipmentDocument } from '../../domain/equipment-document';
import { EquipmentDocumentRepository } from '../../domain/equipment-document.repository';
import { EquipmentRepository } from '../../domain/equipment.repository';
import { EquipmentNotFoundException } from '../../domain/errors/equipment-not-found.exception';
import { CreateEquipmentDocumentUseCase } from './create-equipment-document.use-case';

class InMemoryEquipmentDocumentRepository implements EquipmentDocumentRepository {
  readonly documents = new Map<string, EquipmentDocument>();
  readonly contents = new Map<string, Buffer>();

  findByEquipment(equipmentId: string): Promise<EquipmentDocument[]> {
    return Promise.resolve([...this.documents.values()].filter((document) => document.getEquipmentId() === equipmentId));
  }

  findById(equipmentId: string, documentId: string): Promise<EquipmentDocument | null> {
    const document = this.documents.get(documentId);
    return Promise.resolve(document?.getEquipmentId() === equipmentId ? document : null);
  }

  save(document: EquipmentDocument): Promise<void> {
    this.documents.set(document.getId(), document);
    return Promise.resolve();
  }

  delete(): Promise<boolean> {
    return Promise.resolve(true);
  }

  saveContent(_equipmentId: string, documentId: string, content: Buffer): Promise<void> {
    this.contents.set(documentId, content);
    return Promise.resolve();
  }

  findContent(_equipmentId: string, documentId: string): Promise<Buffer | null> {
    return Promise.resolve(this.contents.get(documentId) ?? null);
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

class SequentialIdGenerator implements IdGenerator {
  generate(): string {
    return 'equipment-document-1';
  }
}

const COMMAND = {
  equipmentId: 'equipment-1',
  name: 'Inspection report',
  issueDate: null,
  expiryDate: null,
  notes: 'Annual inspection',
  file: {
    buffer: Buffer.from('%PDF-1.7'),
    originalName: 'inspection.pdf',
    mimeType: 'application/pdf',
    size: 8,
  },
};

function buildEquipment(): Equipment {
  return Equipment.create({ id: 'equipment-1', name: 'Forklift', price: null, stock: 1 });
}

describe('CreateEquipmentDocumentUseCase', () => {
  it('requires the equipment before storing metadata and encrypted-content input', async () => {
    const repository = new InMemoryEquipmentDocumentRepository();
    const useCase = new CreateEquipmentDocumentUseCase(
      repository,
      new FakeEquipmentRepository(buildEquipment()),
      new SequentialIdGenerator(),
    );

    const document = await useCase.execute(COMMAND);

    expect(document.getId()).toBe('equipment-document-1');
    expect(repository.documents.has(document.getId())).toBe(true);
    expect(repository.contents.get(document.getId())).toEqual(COMMAND.file.buffer);
  });

  it('throws EquipmentNotFoundException without storing a document for an unknown equipment', async () => {
    const repository = new InMemoryEquipmentDocumentRepository();
    const useCase = new CreateEquipmentDocumentUseCase(
      repository,
      new FakeEquipmentRepository(null),
      new SequentialIdGenerator(),
    );

    await expect(useCase.execute(COMMAND)).rejects.toThrow(EquipmentNotFoundException);
    expect(repository.documents.size).toBe(0);
  });
});
