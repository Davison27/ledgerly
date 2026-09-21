import { Equipment } from '../../domain/equipment';
import { EquipmentNotFoundException } from '../../domain/errors/equipment-not-found.exception';
import { EquipmentRepository } from '../../domain/equipment.repository';
import { EquipmentReferenceCounter } from '../../domain/equipment-reference-counter.port';
import { DeleteEquipmentUseCase } from './delete-equipment.use-case';

class InMemoryEquipmentRepository implements EquipmentRepository {
  private equipment: Equipment[];
  readonly deletedIds: string[] = [];
  readonly archivedIds: string[] = [];

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

  archive(id: string): Promise<void> {
    this.archivedIds.push(id);
    return Promise.resolve();
  }

  snapshot(): Equipment[] {
    return [...this.equipment];
  }
}

class FakeEquipmentReferenceCounter implements EquipmentReferenceCounter {
  constructor(private readonly references: number) {}

  count(): Promise<number> {
    return Promise.resolve(this.references);
  }
}

describe('DeleteEquipmentUseCase', () => {
  it('rejects an unknown equipment without invoking deletion', async () => {
    const repository = new InMemoryEquipmentRepository();
    const useCase = new DeleteEquipmentUseCase(repository, new FakeEquipmentReferenceCounter(0));

    await expect(useCase.execute('missing-equipment')).rejects.toThrow(EquipmentNotFoundException);

    expect(repository.deletedIds).toEqual([]);
  });

  it('deletes an existing equipment', async () => {
    const equipment = Equipment.create({ id: 'equipment-1', name: 'Equipment', price: 10, stock: 1 });
    const repository = new InMemoryEquipmentRepository([equipment]);
    const useCase = new DeleteEquipmentUseCase(repository, new FakeEquipmentReferenceCounter(0));

    await expect(useCase.execute('equipment-1')).resolves.toBe('deleted');

    expect(repository.snapshot()).toEqual([]);
  });

  it('archives equipment referenced by projects or schedule events', async () => {
    const equipment = Equipment.create({ id: 'equipment-1', name: 'Equipment', price: 10, stock: 1 });
    const repository = new InMemoryEquipmentRepository([equipment]);
    const useCase = new DeleteEquipmentUseCase(repository, new FakeEquipmentReferenceCounter(1));

    await expect(useCase.execute('equipment-1')).resolves.toBe('archived');

    expect(repository.archivedIds).toEqual(['equipment-1']);
    expect(repository.snapshot()).toEqual([equipment]);
  });
});
