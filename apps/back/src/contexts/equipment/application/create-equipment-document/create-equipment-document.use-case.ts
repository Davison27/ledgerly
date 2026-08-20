import { Inject, Injectable } from '@nestjs/common';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';
import { EquipmentDocument } from '../../domain/equipment-document';
import {
  EQUIPMENT_DOCUMENT_REPOSITORY,
  EquipmentDocumentRepository,
} from '../../domain/equipment-document.repository';
import { EQUIPMENT_REPOSITORY, EquipmentRepository } from '../../domain/equipment.repository';
import { EquipmentNotFoundException } from '../../domain/errors/equipment-not-found.exception';
import { CreateEquipmentDocumentCommand } from './create-equipment-document.command';

@Injectable()
export class CreateEquipmentDocumentUseCase {
  constructor(
    @Inject(EQUIPMENT_DOCUMENT_REPOSITORY)
    private readonly equipmentDocumentRepository: EquipmentDocumentRepository,
    @Inject(EQUIPMENT_REPOSITORY)
    private readonly equipmentRepository: EquipmentRepository,
    @Inject(ID_GENERATOR)
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: CreateEquipmentDocumentCommand): Promise<EquipmentDocument> {
    const equipment = await this.equipmentRepository.findById(command.equipmentId);

    if (equipment === null) {
      throw new EquipmentNotFoundException(command.equipmentId);
    }

    const document = EquipmentDocument.create({
      id: this.idGenerator.generate(),
      equipmentId: command.equipmentId,
      name: command.name,
      issueDate: command.issueDate ?? null,
      expiryDate: command.expiryDate ?? null,
      notes: command.notes ?? null,
      fileName: command.file.originalName,
      mimeType: command.file.mimeType,
      fileSize: command.file.size,
    });

    await this.equipmentDocumentRepository.save(document);
    await this.equipmentDocumentRepository.saveContent(document.getEquipmentId(), document.getId(), command.file.buffer);

    return document;
  }
}
