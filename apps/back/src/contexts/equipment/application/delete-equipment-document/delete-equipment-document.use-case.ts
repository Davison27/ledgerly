import { Inject, Injectable } from '@nestjs/common';
import {
  EQUIPMENT_DOCUMENT_REPOSITORY,
  EquipmentDocumentRepository,
} from '../../domain/equipment-document.repository';
import { EquipmentDocumentNotFoundException } from '../../domain/errors/equipment-document-not-found.exception';

@Injectable()
export class DeleteEquipmentDocumentUseCase {
  constructor(
    @Inject(EQUIPMENT_DOCUMENT_REPOSITORY)
    private readonly equipmentDocumentRepository: EquipmentDocumentRepository,
  ) {}

  async execute(equipmentId: string, documentId: string): Promise<void> {
    const deleted = await this.equipmentDocumentRepository.delete(equipmentId, documentId);

    if (!deleted) {
      throw new EquipmentDocumentNotFoundException(documentId);
    }
  }
}
