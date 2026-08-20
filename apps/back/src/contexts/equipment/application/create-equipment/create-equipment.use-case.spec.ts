import { CreateEquipmentUseCase } from './create-equipment.use-case';
import { EquipmentRepository } from '../../domain/equipment.repository';
import { Equipment } from '../../domain/equipment';
import { EquipmentNameAlreadyExistsException } from '../../domain/errors/equipment-name-already-exists.exception';
import { IdGenerator } from '../../../../shared/domain/id-generator.port';

class InMemoryEquipmentRepository implements EquipmentRepository {
  private equipment: Equipment[] = [];

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

class SequentialIdGenerator implements IdGenerator {
  private nextId = 1;

  generate(): string {
    return `generated-id-${this.nextId++}`;
  }
}

describe('CreateEquipmentUseCase', () => {
  it('creates equipment with a price', async () => {
    const repository = new InMemoryEquipmentRepository();
    const useCase = new CreateEquipmentUseCase(repository, new SequentialIdGenerator());

    const equipment = await useCase.execute({ name: 'Diseño web', price: 500 });

    expect(equipment.id).toBe('generated-id-1');
    expect(equipment.name).toBe('Diseño web');
    expect(equipment.price).toBe(500);
    expect(await repository.findById(equipment.id)).not.toBeNull();
  });

  it('creates equipment without a price', async () => {
    const repository = new InMemoryEquipmentRepository();
    const useCase = new CreateEquipmentUseCase(repository, new SequentialIdGenerator());

    const equipment = await useCase.execute({ name: 'Consultoría' });

    expect(equipment.price).toBeNull();
    expect(await repository.findAll()).toHaveLength(1);
  });

  it('creates equipment with stock left at zero by default', async () => {
    const repository = new InMemoryEquipmentRepository();
    const useCase = new CreateEquipmentUseCase(repository, new SequentialIdGenerator());

    const equipment = await useCase.execute({ name: 'Consultoría' });

    expect(equipment.stock).toBe(0);
  });

  it('creates equipment with the given stock', async () => {
    const repository = new InMemoryEquipmentRepository();
    const useCase = new CreateEquipmentUseCase(repository, new SequentialIdGenerator());

    const equipment = await useCase.execute({ name: 'Diseño web', price: 500, stock: 12 });

    expect(equipment.stock).toBe(12);
  });

  it('throws EquipmentNameAlreadyExistsException when the name is already used', async () => {
    const repository = new InMemoryEquipmentRepository();
    const useCase = new CreateEquipmentUseCase(repository, new SequentialIdGenerator());

    await useCase.execute({ name: 'Diseño web', price: 500 });

    await expect(useCase.execute({ name: 'Diseño web', price: 600 })).rejects.toThrow(
      EquipmentNameAlreadyExistsException,
    );

    expect(await repository.findAll()).toHaveLength(1);
  });
});
