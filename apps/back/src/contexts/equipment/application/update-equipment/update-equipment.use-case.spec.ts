import { UpdateEquipmentUseCase } from './update-equipment.use-case';
import { EquipmentRepository } from '../../domain/equipment.repository';
import { Equipment } from '../../domain/equipment';
import { EquipmentNotFoundException } from '../../domain/errors/equipment-not-found.exception';
import { EquipmentNameAlreadyExistsException } from '../../domain/errors/equipment-name-already-exists.exception';

class InMemoryEquipmentRepository implements EquipmentRepository {
  private equipment: Equipment[] = [];

  constructor(initial: Equipment[] = []) {
    this.equipment = initial;
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
    const index = this.equipment.findIndex((existing) => existing.id === equipment.id);

    if (index === -1) {
      this.equipment.push(equipment);
    } else {
      this.equipment[index] = equipment;
    }

    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.equipment = this.equipment.filter((equipment) => equipment.id !== id);
    return Promise.resolve();
  }
}

describe('UpdateEquipmentUseCase', () => {
  it('renames the equipment and changes its price', async () => {
    const repository = new InMemoryEquipmentRepository([
      Equipment.create({ id: 'equipment-1', name: 'Diseño web', price: 500, stock: 10 }),
    ]);
    const useCase = new UpdateEquipmentUseCase(repository);

    const equipment = await useCase.execute({ id: 'equipment-1', name: 'Diseño gráfico', price: 600 });

    expect(equipment.name).toBe('Diseño gráfico');
    expect(equipment.price).toBe(600);
  });

  it('clears the price when it is set to null', async () => {
    const repository = new InMemoryEquipmentRepository([
      Equipment.create({ id: 'equipment-1', name: 'Diseño web', price: 500, stock: 10 }),
    ]);
    const useCase = new UpdateEquipmentUseCase(repository);

    const equipment = await useCase.execute({ id: 'equipment-1', price: null });

    expect(equipment.price).toBeNull();
  });

  it('changes the stock when it is given', async () => {
    const repository = new InMemoryEquipmentRepository([
      Equipment.create({ id: 'equipment-1', name: 'Diseño web', price: 500, stock: 10 }),
    ]);
    const useCase = new UpdateEquipmentUseCase(repository);

    const equipment = await useCase.execute({ id: 'equipment-1', price: 500, stock: 30 });

    expect(equipment.stock).toBe(30);
  });

  it('leaves the stock untouched when it is omitted', async () => {
    const repository = new InMemoryEquipmentRepository([
      Equipment.create({ id: 'equipment-1', name: 'Diseño web', price: 500, stock: 10 }),
    ]);
    const useCase = new UpdateEquipmentUseCase(repository);

    const equipment = await useCase.execute({ id: 'equipment-1', price: 500 });

    expect(equipment.stock).toBe(10);
  });

  it('updates and clears catalog details independently from billing data', async () => {
    const repository = new InMemoryEquipmentRepository([
      Equipment.create({
        id: 'equipment-1',
        name: 'Diseño web',
        price: 500,
        stock: 10,
        reference: 'SERV-001',
        category: 'Diseño',
        tags: ['branding'],
      }),
    ]);
    const useCase = new UpdateEquipmentUseCase(repository);

    const equipment = await useCase.execute({
      id: 'equipment-1',
      description: 'Diseño web corporativo.',
      category: null,
      tags: ['web'],
    });

    expect(equipment.reference).toBe('SERV-001');
    expect(equipment.category).toBeNull();
    expect(equipment.description).toBe('Diseño web corporativo.');
    expect(equipment.tags).toEqual(['web']);
    expect(equipment.price).toBe(500);
    expect(equipment.stock).toBe(10);
  });

  it('throws EquipmentNotFoundException when the equipment does not exist', async () => {
    const repository = new InMemoryEquipmentRepository();
    const useCase = new UpdateEquipmentUseCase(repository);

    await expect(useCase.execute({ id: 'missing-id', price: null })).rejects.toThrow(
      EquipmentNotFoundException,
    );
  });

  it('throws EquipmentNameAlreadyExistsException when renaming to a name already in use', async () => {
    const repository = new InMemoryEquipmentRepository([
      Equipment.create({ id: 'equipment-1', name: 'Diseño web', price: 500, stock: 10 }),
      Equipment.create({ id: 'equipment-2', name: 'Consultoría', price: null, stock: 0 }),
    ]);
    const useCase = new UpdateEquipmentUseCase(repository);

    await expect(
      useCase.execute({ id: 'equipment-2', name: 'Diseño web', price: null }),
    ).rejects.toThrow(EquipmentNameAlreadyExistsException);
  });
});
