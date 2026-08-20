import { Inject, Injectable } from '@nestjs/common';
import { Equipment } from '../../domain/equipment';
import {
  EQUIPMENT_REPOSITORY,
  EquipmentRepository,
} from '../../domain/equipment.repository';

@Injectable()
export class ListEquipmentUseCase {
  constructor(
    @Inject(EQUIPMENT_REPOSITORY)
    private readonly equipmentRepository: EquipmentRepository,
  ) {}

  execute(): Promise<Equipment[]> {
    return this.equipmentRepository.findAll();
  }
}
