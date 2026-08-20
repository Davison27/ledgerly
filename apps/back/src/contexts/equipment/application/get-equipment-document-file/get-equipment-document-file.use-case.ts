import { Inject, Injectable } from '@nestjs/common';
import {
  EQUIPMENT_DOCUMENT_REPOSITORY,
  EquipmentDocumentRepository,
} from '../../domain/equipment-document.repository';
import { EquipmentDocumentNotFoundException } from '../../domain/errors/equipment-document-not-found.exception';

export interface EquipmentDocumentFileResult {
  content: Buffer;
  fileName: string;
  mimeType: string;
}

@Injectable()
export class GetEquipmentDocumentFileUseCase {
  constructor(
    @Inject(EQUIPMENT_DOCUMENT_REPOSITORY)
    private readonly equipmentDocumentRepository: EquipmentDocumentRepository,
  ) {}

  async execute(equipmentId: string, documentId: string): Promise<EquipmentDocumentFileResult | null> {
    const document = await this.equipmentDocumentRepository.findById(equipmentId, documentId);

    if (document === null) {
      throw new EquipmentDocumentNotFoundException(documentId);
    }

    const content = await this.equipmentDocumentRepository.findContent(equipmentId, documentId);

    if (content === null) {
      return null;
    }

    return {
      content,
      fileName: document.getFileName(),
      mimeType: document.getMimeType(),
    };
  }
}
