import { Document } from '../../domain/document';
import { DocumentType } from '../../domain/document-type';
import { DocumentStatus } from '../../domain/document-status';
import { DocumentOrmEntity } from './document.orm-entity';

export class DocumentMapper {
  static toDomain(orm: DocumentOrmEntity): Document {
    return Document.fromPrimitives({
      id: orm.id,
      projectId: orm.projectId,
      name: orm.name,
      type: orm.type as DocumentType,
      month: orm.month,
      date: orm.date,
      amount: Number(orm.amount),
      status: orm.status as DocumentStatus,
    });
  }

  static toOrm(document: Document): DocumentOrmEntity {
    const primitives = document.toPrimitives();
    const orm = new DocumentOrmEntity();

    orm.id = primitives.id;
    orm.projectId = primitives.projectId;
    orm.name = primitives.name;
    orm.type = primitives.type;
    orm.month = primitives.month;
    orm.date = primitives.date;
    orm.amount = primitives.amount.toString();
    orm.status = primitives.status;

    return orm;
  }
}
