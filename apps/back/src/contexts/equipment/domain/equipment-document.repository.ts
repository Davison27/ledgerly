import { EquipmentDocument } from './equipment-document';

export const EQUIPMENT_DOCUMENT_REPOSITORY = Symbol('EquipmentDocumentRepository');

export interface EquipmentDocumentRepository {
  findByEquipment(equipmentId: string): Promise<EquipmentDocument[]>;
  findById(equipmentId: string, documentId: string): Promise<EquipmentDocument | null>;
  save(document: EquipmentDocument): Promise<void>;
  delete(equipmentId: string, documentId: string): Promise<boolean>;
  saveContent(equipmentId: string, documentId: string, content: Buffer): Promise<void>;
  findContent(equipmentId: string, documentId: string): Promise<Buffer | null>;
}
