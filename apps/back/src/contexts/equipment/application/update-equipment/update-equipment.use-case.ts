import { Inject, Injectable } from '@nestjs/common';
import { Equipment } from '../../domain/equipment';
import {
  EQUIPMENT_REPOSITORY,
  EquipmentRepository,
} from '../../domain/equipment.repository';
import { EquipmentNotFoundException } from '../../domain/errors/equipment-not-found.exception';
import { EquipmentNameAlreadyExistsException } from '../../domain/errors/equipment-name-already-exists.exception';
import { UpdateEquipmentCommand } from './update-equipment.command';

@Injectable()
export class UpdateEquipmentUseCase {
  constructor(
    @Inject(EQUIPMENT_REPOSITORY)
    private readonly equipmentRepository: EquipmentRepository,
  ) {}

  async execute(command: UpdateEquipmentCommand): Promise<Equipment> {
    const equipment = await this.equipmentRepository.findById(command.id);

    if (equipment === null) {
      throw new EquipmentNotFoundException(command.id);
    }

    if (command.name !== undefined && command.name !== equipment.name) {
      const existing = await this.equipmentRepository.findByName(command.name);

      if (existing !== null) {
        throw new EquipmentNameAlreadyExistsException(command.name);
      }
    }

    if (command.name !== undefined) {
      equipment.rename(command.name);
    }

    if (command.price !== undefined) {
      equipment.changePrice(command.price);
    }

    if (command.stock !== undefined) {
      equipment.changeStock(command.stock);
    }

    if (command.leasingMonthlyFee !== undefined) {
      equipment.changeLeasingMonthlyFee(command.leasingMonthlyFee);
    }

    if (
      command.reference !== undefined ||
      command.category !== undefined ||
      command.brand !== undefined ||
      command.description !== undefined ||
      command.image !== undefined ||
      command.tags !== undefined
    ) {
      equipment.changeDetails({
        reference: command.reference === undefined ? equipment.reference : command.reference,
        category: command.category === undefined ? equipment.category : command.category,
        brand: command.brand === undefined ? equipment.brand : command.brand,
        description: command.description === undefined ? equipment.description : command.description,
        image: command.image === undefined ? equipment.image : command.image,
        tags: command.tags === undefined ? equipment.tags : command.tags,
      });
    }

    await this.equipmentRepository.save(equipment);

    return equipment;
  }
}
