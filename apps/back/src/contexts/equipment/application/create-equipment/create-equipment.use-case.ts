import { Inject, Injectable } from '@nestjs/common';
import { Equipment } from '../../domain/equipment';
import {
  EQUIPMENT_REPOSITORY,
  EquipmentRepository,
} from '../../domain/equipment.repository';
import { EquipmentNameAlreadyExistsException } from '../../domain/errors/equipment-name-already-exists.exception';
import {
  ID_GENERATOR,
  IdGenerator,
} from '../../../../shared/domain/id-generator.port';
import { CreateEquipmentCommand } from './create-equipment.command';

@Injectable()
export class CreateEquipmentUseCase {
  constructor(
    @Inject(EQUIPMENT_REPOSITORY)
    private readonly equipmentRepository: EquipmentRepository,
    @Inject(ID_GENERATOR)
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: CreateEquipmentCommand): Promise<Equipment> {
    const existing = await this.equipmentRepository.findByName(command.name);

    if (existing !== null) {
      throw new EquipmentNameAlreadyExistsException(command.name);
    }

    const equipment = Equipment.create({
      id: this.idGenerator.generate(),
      name: command.name,
      price: command.price ?? null,
      stock: command.stock ?? 0,
      reference: command.reference,
      category: command.category,
      brand: command.brand,
      description: command.description,
      image: command.image,
      tags: command.tags,
      leasingMonthlyFee: command.leasingMonthlyFee,
    });

    await this.equipmentRepository.save(equipment);

    return equipment;
  }
}
