import { CompanyDocument } from '../../domain/company-document';
import { CompanyDocumentOrmEntity } from './company-document.orm-entity';

export class CompanyDocumentMapper {
  static toDomain(orm: CompanyDocumentOrmEntity): CompanyDocument {
    return CompanyDocument.fromPrimitives({
      id: orm.id,
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

  static toOrm(document: CompanyDocument): CompanyDocumentOrmEntity {
    const primitives = document.toPrimitives();
    const orm = new CompanyDocumentOrmEntity();

    orm.id = primitives.id;
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
