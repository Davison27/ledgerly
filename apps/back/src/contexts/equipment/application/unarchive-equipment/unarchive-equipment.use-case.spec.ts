import { Equipment } from '../../domain/equipment';
import { EquipmentRepository } from '../../domain/equipment.repository';
import { EquipmentNotFoundException } from '../../domain/errors/equipment-not-found.exception';
import { UnarchiveEquipmentUseCase } from './unarchive-equipment.use-case';

function buildEquipment(): Equipment {
  return Equipment.create({ id: 'equipment-1', name: 'Camera', price: 10, stock: 1 });
}

describe('UnarchiveEquipmentUseCase', () => {
  it('clears the archive marker for an existing equipment item', async () => {
    const unarchive = jest.fn().mockResolvedValue(undefined);
    const repository = {
      findById: jest.fn().mockResolvedValue(buildEquipment()),
      unarchive,
    } as unknown as EquipmentRepository;
    const useCase = new UnarchiveEquipmentUseCase(repository);

    await useCase.execute('equipment-1');

    expect(unarchive).toHaveBeenCalledWith('equipment-1');
  });

  it('rejects an unknown equipment item', async () => {
    const unarchive = jest.fn();
    const repository = {
      findById: jest.fn().mockResolvedValue(null),
      unarchive,
    } as unknown as EquipmentRepository;
    const useCase = new UnarchiveEquipmentUseCase(repository);

    await expect(useCase.execute('missing-equipment')).rejects.toThrow(EquipmentNotFoundException);
    expect(unarchive).not.toHaveBeenCalled();
  });
});
