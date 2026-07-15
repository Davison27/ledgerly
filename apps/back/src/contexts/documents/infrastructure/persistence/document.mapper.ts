import { Document } from '../../domain/document';
import { DocumentType } from '../../domain/document-type';
import { DocumentStatus } from '../../domain/document-status';
import { DocumentCurrency } from '../../domain/document-currency';
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
      issuerName: orm.issuerName,
      issuerTaxId: orm.issuerTaxId,
      invoiceNumber: orm.invoiceNumber,
      dueDate: orm.dueDate,
      taxBase: orm.taxBase != null ? Number(orm.taxBase) : null,
      taxRate: orm.taxRate != null ? Number(orm.taxRate) : null,
      taxAmount: orm.taxAmount != null ? Number(orm.taxAmount) : null,
      currency: orm.currency as DocumentCurrency,
      fileName: orm.fileName,
      mimeType: orm.mimeType,
      fileSize: orm.fileSize,
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
    orm.issuerName = primitives.issuerName;
    orm.issuerTaxId = primitives.issuerTaxId;
    orm.invoiceNumber = primitives.invoiceNumber;
    orm.dueDate = primitives.dueDate;
    orm.taxBase = primitives.taxBase != null ? primitives.taxBase.toString() : null;
    orm.taxRate = primitives.taxRate != null ? primitives.taxRate.toString() : null;
    orm.taxAmount = primitives.taxAmount != null ? primitives.taxAmount.toString() : null;
    orm.currency = primitives.currency;
    orm.fileName = primitives.fileName;
    orm.mimeType = primitives.mimeType;
    orm.fileSize = primitives.fileSize;

    return orm;
  }
}
