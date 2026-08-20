import { Equipment } from '../../domain/equipment';
import { EquipmentNotFoundException } from '../../domain/errors/equipment-not-found.exception';
import { EquipmentRepository } from '../../domain/equipment.repository';
import { DeleteEquipmentUseCase } from './delete-equipment.use-case';

class InMemoryEquipmentRepository implements EquipmentRepository {
  private equipment: Equipment[];
  readonly deletedIds: string[] = [];

  constructor(equipment: Equipment[] = []) {
    this.equipment = equipment;
  }

  findAll(): Promise<Equipment[]> {
    return Promise.resolve([...this.equipment]);
  }

  findById(id: string): Promise<Equipment | null> {
    return Promise.resolve(this.equipment.find((equipment) => equipment.id === id) ?? null);
  }

  findByName(name: string): Promise<Equipment | null> {
    return Promise.resolve(this.equipment.find((equipment) => equipment.name === name) ?? null);
  }

  save(equipment: Equipment): Promise<void> {
    this.equipment.push(equipment);
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.deletedIds.push(id);
    this.equipment = this.equipment.filter((equipment) => equipment.id !== id);
    return Promise.resolve();
  }

  snapshot(): Equipment[] {
    return [...this.equipment];
  }
}

describe('DeleteEquipmentUseCase', () => {
  it('rejects an unknown equipment without invoking deletion', async () => {
    const repository = new InMemoryEquipmentRepository();
    const useCase = new DeleteEquipmentUseCase(repository);

    await expect(useCase.execute('missing-equipment')).rejects.toThrow(EquipmentNotFoundException);

    expect(repository.deletedIds).toEqual([]);
  });

  it('deletes an existing equipment', async () => {
    const equipment = Equipment.create({ id: 'equipment-1', name: 'Equipment', price: 10, stock: 1 });
    const repository = new InMemoryEquipmentRepository([equipment]);
    const useCase = new DeleteEquipmentUseCase(repository);

    await useCase.execute('equipment-1');

    expect(repository.snapshot()).toEqual([]);
  });
});
