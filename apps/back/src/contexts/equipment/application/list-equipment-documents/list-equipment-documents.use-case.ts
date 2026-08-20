import { Inject, Injectable } from '@nestjs/common';
import { EquipmentDocument } from '../../domain/equipment-document';
import {
  EQUIPMENT_DOCUMENT_REPOSITORY,
  EquipmentDocumentRepository,
} from '../../domain/equipment-document.repository';
import { EQUIPMENT_REPOSITORY, EquipmentRepository } from '../../domain/equipment.repository';
import { EquipmentNotFoundException } from '../../domain/errors/equipment-not-found.exception';

@Injectable()
export class ListEquipmentDocumentsUseCase {
  constructor(
    @Inject(EQUIPMENT_DOCUMENT_REPOSITORY)
    private readonly equipmentDocumentRepository: EquipmentDocumentRepository,
    @Inject(EQUIPMENT_REPOSITORY)
    private readonly equipmentRepository: EquipmentRepository,
  ) {}

  async execute(equipmentId: string): Promise<EquipmentDocument[]> {
    const equipment = await this.equipmentRepository.findById(equipmentId);

    if (equipment === null) {
      throw new EquipmentNotFoundException(equipmentId);
    }

    return this.equipmentDocumentRepository.findByEquipment(equipmentId);
  }
}
