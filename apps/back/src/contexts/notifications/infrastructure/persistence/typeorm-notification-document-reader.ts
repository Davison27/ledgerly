import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentOrmEntity } from '../../../documents/infrastructure/persistence/document.orm-entity';
import {
  NotificationDocumentReader,
  NotificationDocumentRow,
} from '../../domain/notification-document-reader.port';

function toRow(orm: DocumentOrmEntity): NotificationDocumentRow {
  return {
    id: orm.id,
    projectId: orm.projectId,
    name: orm.name,
    amount: Number(orm.amount),
    dueDate: orm.dueDate,
    type: orm.type,
  };
}

@Injectable()
export class TypeOrmNotificationDocumentReader implements NotificationDocumentReader {
  constructor(
    @InjectRepository(DocumentOrmEntity) private readonly repository: Repository<DocumentOrmEntity>,
  ) {}

  async findPendingDueUpTo(limitDate: string): Promise<NotificationDocumentRow[]> {
    const orms = await this.repository
      .createQueryBuilder('document')
      .select([
        'document.id',
        'document.projectId',
        'document.name',
        'document.amount',
        'document.dueDate',
        'document.type',
      ])
      .where('document.status = :status', { status: 'pendiente' })
      .andWhere('document.due_date IS NOT NULL')
      .andWhere('document.due_date <= :limitDate', { limitDate })
      .getMany();

    return orms.map((orm) => toRow(orm));
  }

  async findInvoicesWithoutInvoiceNumber(): Promise<NotificationDocumentRow[]> {
    const orms = await this.repository
      .createQueryBuilder('document')
      .select([
        'document.id',
        'document.projectId',
        'document.name',
        'document.amount',
        'document.dueDate',
        'document.type',
      ])
      .where('document.type = :type', { type: 'factura' })
      .andWhere('document.invoice_number IS NULL')
      .getMany();

    return orms.map((orm) => toRow(orm));
  }
}
