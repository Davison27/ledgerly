import { StaffDocument } from '../../domain/staff-document';
import { StaffDocumentOrmEntity } from './staff-document.orm-entity';

export class StaffDocumentMapper {
  static toDomain(orm: StaffDocumentOrmEntity): StaffDocument {
    return StaffDocument.fromPrimitives({
      id: orm.id,
      staffMemberId: orm.staffMemberId,
      typeId: orm.typeId,
      name: orm.name,
      issueDate: orm.issueDate,
      expiryDate: orm.expiryDate,
      notes: orm.notes,
      fileName: orm.fileName,
      mimeType: orm.mimeType,
      fileSize: orm.fileSize,
    });
  }

  // Deliberately never assigns `content` (bytea, `select: false`): the same
  // guarantee `document.mapper.ts` relies on so that `repository.save()` on
  // an edit can never wipe out the stored file. Content is only ever
  // written through `saveContent`.
  static toOrm(staffDocument: StaffDocument): StaffDocumentOrmEntity {
    const primitives = staffDocument.toPrimitives();
    const orm = new StaffDocumentOrmEntity();

    orm.id = primitives.id;
    orm.staffMemberId = primitives.staffMemberId;
    orm.typeId = primitives.typeId;
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
