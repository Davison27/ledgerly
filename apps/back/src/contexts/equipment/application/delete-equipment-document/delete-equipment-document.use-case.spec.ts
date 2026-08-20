import { EquipmentDocument } from '../../domain/equipment-document';
import { EquipmentDocumentRepository } from '../../domain/equipment-document.repository';
import { EquipmentDocumentNotFoundException } from '../../domain/errors/equipment-document-not-found.exception';
import { DeleteEquipmentDocumentUseCase } from './delete-equipment-document.use-case';

class AtomicDeleteRepository implements EquipmentDocumentRepository {
  readonly deleteCalls: Array<[string, string]> = [];

  findByEquipment(): Promise<EquipmentDocument[]> {
    return Promise.resolve([]);
  }

  findById(): Promise<EquipmentDocument | null> {
    throw new Error('delete must not pre-load the document');
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  delete(equipmentId: string, documentId: string): Promise<boolean> {
    this.deleteCalls.push([equipmentId, documentId]);
    return Promise.resolve(equipmentId === 'equipment-1' && documentId === 'existing');
  }

  saveContent(): Promise<void> {
    return Promise.resolve();
  }

  findContent(): Promise<Buffer | null> {
    return Promise.resolve(null);
  }
}

describe('DeleteEquipmentDocumentUseCase', () => {
  it('uses the scoped affected-row result for deletion', async () => {
    const repository = new AtomicDeleteRepository();
    const useCase = new DeleteEquipmentDocumentUseCase(repository);

    await useCase.execute('equipment-1', 'existing');

    expect(repository.deleteCalls).toEqual([['equipment-1', 'existing']]);
  });

  it('throws EquipmentDocumentNotFoundException for an unknown or mismatched document', async () => {
    const repository = new AtomicDeleteRepository();
    const useCase = new DeleteEquipmentDocumentUseCase(repository);

    await expect(useCase.execute('equipment-2', 'existing')).rejects.toThrow(EquipmentDocumentNotFoundException);
    expect(repository.deleteCalls).toEqual([['equipment-2', 'existing']]);
  });
});
