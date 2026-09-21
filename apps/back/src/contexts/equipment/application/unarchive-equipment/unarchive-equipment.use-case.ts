import { Inject, Injectable } from '@nestjs/common';
import {
  EQUIPMENT_REPOSITORY,
  EquipmentRepository,
} from '../../domain/equipment.repository';
import { EquipmentNotFoundException } from '../../domain/errors/equipment-not-found.exception';

@Injectable()
export class UnarchiveEquipmentUseCase {
  constructor(
    @Inject(EQUIPMENT_REPOSITORY)
    private readonly equipmentRepository: EquipmentRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const equipment = await this.equipmentRepository.findById(id);

    if (equipment === null) {
      throw new EquipmentNotFoundException(id);
    }

    if (this.equipmentRepository.unarchive === undefined) {
      throw new Error('Equipment repository does not support unarchiving');
    }

    await this.equipmentRepository.unarchive(id);
  }
}
