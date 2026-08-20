import { EquipmentDocument } from '../../domain/equipment-document';
import { EquipmentDocumentOrmEntity } from './equipment-document.orm-entity';

export class EquipmentDocumentMapper {
  static toDomain(orm: EquipmentDocumentOrmEntity): EquipmentDocument {
    return EquipmentDocument.fromPrimitives({
      id: orm.id,
      equipmentId: orm.equipmentId,
      name: orm.name,
      issueDate: orm.issueDate,
      expiryDate: orm.expiryDate,
      notes: orm.notes,
      fileName: orm.fileName,
      mimeType: orm.mimeType,
      fileSize: orm.fileSize,
    });
  }

  static toOrm(document: EquipmentDocument): EquipmentDocumentOrmEntity {
    const primitives = document.toPrimitives();
    const orm = new EquipmentDocumentOrmEntity();

    orm.id = primitives.id;
    orm.equipmentId = primitives.equipmentId;
    orm.name = primitives.name;
    orm.issueDate = primitives.issueDate;
    orm.expiryDate = primitives.expiryDate;
    orm.notes = primitives.notes;
    orm.fileName = primitives.fileName;
    orm.mimeType = primitives.mimeType;
    orm.fileSize = primitives.fileSize;

    return orm;
  }
}
