import { Inject, Injectable } from '@nestjs/common';
import { EquipmentDocument, EquipmentDocumentProps } from '../../domain/equipment-document';
import {
  EQUIPMENT_DOCUMENT_REPOSITORY,
  EquipmentDocumentRepository,
} from '../../domain/equipment-document.repository';
import { EquipmentDocumentNotFoundException } from '../../domain/errors/equipment-document-not-found.exception';
import { UpdateEquipmentDocumentCommand } from './update-equipment-document.command';

type EquipmentDocumentChanges = Partial<Pick<EquipmentDocumentProps, 'name' | 'issueDate' | 'expiryDate' | 'notes'>>;

@Injectable()
export class UpdateEquipmentDocumentUseCase {
  constructor(
    @Inject(EQUIPMENT_DOCUMENT_REPOSITORY)
    private readonly equipmentDocumentRepository: EquipmentDocumentRepository,
  ) {}

  async execute(command: UpdateEquipmentDocumentCommand): Promise<EquipmentDocument> {
    const document = await this.equipmentDocumentRepository.findById(command.equipmentId, command.documentId);

    if (document === null) {
      throw new EquipmentDocumentNotFoundException(command.documentId);
    }

    const changes: EquipmentDocumentChanges = {};

    if (command.name !== undefined) changes.name = command.name;
    if (command.issueDate !== undefined) changes.issueDate = command.issueDate;
    if (command.expiryDate !== undefined) changes.expiryDate = command.expiryDate;
    if (command.notes !== undefined) changes.notes = command.notes;

    const updated = document.withChanges(changes);
    await this.equipmentDocumentRepository.save(updated);

    return updated;
  }
}
