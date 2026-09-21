import { Inject, Injectable } from '@nestjs/common';
import {
  EQUIPMENT_REPOSITORY,
  EquipmentRepository,
} from '../../domain/equipment.repository';
import { EquipmentNotFoundException } from '../../domain/errors/equipment-not-found.exception';
import {
  EQUIPMENT_REFERENCE_COUNTER,
  EquipmentReferenceCounter,
} from '../../domain/equipment-reference-counter.port';

@Injectable()
export class DeleteEquipmentUseCase {
  constructor(
    @Inject(EQUIPMENT_REPOSITORY)
    private readonly equipmentRepository: EquipmentRepository,
    @Inject(EQUIPMENT_REFERENCE_COUNTER)
    private readonly equipmentReferenceCounter: EquipmentReferenceCounter,
  ) {}

  async execute(id: string): Promise<'deleted' | 'archived'> {
    const equipment = await this.equipmentRepository.findById(id);

    if (equipment === null) {
      throw new EquipmentNotFoundException(id);
    }

    const referenceCount = await this.equipmentReferenceCounter.count(id);

    if (referenceCount > 0) {
      await this.equipmentRepository.archive(id);
      return 'archived';
    }

    await this.equipmentRepository.delete(id);
    return 'deleted';
  }
}
