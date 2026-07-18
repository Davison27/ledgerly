import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../../domain/document';
import { DocumentFilters } from '../../domain/document-filters';
import { DocumentRepository } from '../../domain/document.repository';
import { DocumentDashboardRow } from '../../domain/document-dashboard-row';
import { DocumentListFilters } from '../../domain/document-list-filters';
import { DocumentListRow } from '../../domain/document-list-row';
import { DocumentDuplicateCriteria } from '../../domain/document-duplicate-criteria';
import { DocumentDuplicateRow } from '../../domain/document-duplicate-row';
import { DocumentType } from '../../domain/document-type';
import { DocumentStatus } from '../../domain/document-status';
import { DocumentCurrency } from '../../domain/document-currency';
import { DocumentOrmEntity } from './document.orm-entity';
import { DocumentMapper } from './document.mapper';

@Injectable()
export class TypeOrmDocumentRepository implements DocumentRepository {
  constructor(
    @InjectRepository(DocumentOrmEntity) private readonly repository: Repository<DocumentOrmEntity>,
  ) {}

  async findByProject(projectId: string, filters: DocumentFilters): Promise<Document[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('document')
      .where('document.project_id = :projectId', { projectId });

    if (filters.search) {
      queryBuilder.andWhere('LOWER(document.name) LIKE :search', {
        search: `%${filters.search.toLowerCase()}%`,
      });
    }

    if (filters.type) {
      queryBuilder.andWhere('document.type = :type', { type: filters.type });
    }

    if (filters.status) {
      queryBuilder.andWhere('document.status = :status', { status: filters.status });
    }

    if (filters.dateFrom) {
      queryBuilder.andWhere('document.date >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      queryBuilder.andWhere('document.date <= :dateTo', { dateTo: filters.dateTo });
    }

    if (filters.amountMin !== undefined) {
      queryBuilder.andWhere('document.amount >= :amountMin', { amountMin: filters.amountMin });
    }

    if (filters.amountMax !== undefined) {
      queryBuilder.andWhere('document.amount <= :amountMax', { amountMax: filters.amountMax });
    }

    queryBuilder.orderBy('document.date', 'DESC');

    const orms = await queryBuilder.getMany();

    return orms.map((orm) => DocumentMapper.toDomain(orm));
  }

  async findById(id: string): Promise<Document | null> {
    const orm = await this.repository.findOne({ where: { id } });

    return orm ? DocumentMapper.toDomain(orm) : null;
  }

  async save(document: Document): Promise<void> {
    await this.repository.save(DocumentMapper.toOrm(document));
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  async saveContent(documentId: string, content: Buffer): Promise<void> {
    await this.repository.update({ id: documentId }, { content });
  }

  async findContent(documentId: string): Promise<Buffer | null> {
    const orm = await this.repository
      .createQueryBuilder('document')
      .select(['document.id'])
      .addSelect('document.content')
      .where('document.id = :documentId', { documentId })
      .getOne();

    return orm?.content ?? null;
  }

  async findAllForDashboard(): Promise<DocumentDashboardRow[]> {
    const orms = await this.repository.find({
      select: {
        type: true,
        amount: true,
        month: true,
        status: true,
        issuerName: true,
        projectId: true,
        date: true,
        dueDate: true,
        taxAmount: true,
      },
    });

    return orms.map((orm) => ({
      type: orm.type as DocumentType,
      amount: Number(orm.amount),
      month: orm.month,
      status: orm.status as DocumentStatus,
      issuerName: orm.issuerName,
      projectId: orm.projectId,
      date: orm.date,
      dueDate: orm.dueDate,
      taxAmount: orm.taxAmount !== null ? Number(orm.taxAmount) : null,
    }));
  }

  async findAllForListing(filters: DocumentListFilters): Promise<DocumentListRow[]> {
    const queryBuilder = this.repository.createQueryBuilder('document');

    if (filters.projectId) {
      queryBuilder.andWhere('document.project_id = :projectId', { projectId: filters.projectId });
    }

    if (filters.supplierId) {
      queryBuilder.andWhere('document.supplier_id = :supplierId', { supplierId: filters.supplierId });
    }

    if (filters.search) {
      queryBuilder.andWhere('LOWER(document.name) LIKE :search', {
        search: `%${filters.search.toLowerCase()}%`,
      });
    }

    if (filters.type) {
      queryBuilder.andWhere('document.type = :type', { type: filters.type });
    }

    if (filters.status) {
      queryBuilder.andWhere('document.status = :status', { status: filters.status });
    }

    if (filters.dateFrom) {
      queryBuilder.andWhere('document.date >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      queryBuilder.andWhere('document.date <= :dateTo', { dateTo: filters.dateTo });
    }

    if (filters.amountMin !== undefined) {
      queryBuilder.andWhere('document.amount >= :amountMin', { amountMin: filters.amountMin });
    }

    if (filters.amountMax !== undefined) {
      queryBuilder.andWhere('document.amount <= :amountMax', { amountMax: filters.amountMax });
    }

    queryBuilder.orderBy('document.date', 'DESC');

    const orms = await queryBuilder.getMany();

    return orms.map((orm) => ({
      id: orm.id,
      projectId: orm.projectId,
      name: orm.name,
      type: orm.type as DocumentType,
      status: orm.status as DocumentStatus,
      date: orm.date,
      dueDate: orm.dueDate,
      amount: Number(orm.amount),
      currency: orm.currency as DocumentCurrency,
      issuerName: orm.issuerName,
      invoiceNumber: orm.invoiceNumber,
      supplierId: orm.supplierId,
    }));
  }

  async findPossibleDuplicates(criteria: DocumentDuplicateCriteria): Promise<DocumentDuplicateRow[]> {
    const orms = await this.repository
      .createQueryBuilder('document')
      .where('LOWER(TRIM(document.invoice_number)) = :invoiceNumber', {
        invoiceNumber: criteria.invoiceNumber.trim().toLowerCase(),
      })
      .andWhere('document.amount = :amount', { amount: criteria.amount })
      .getMany();

    return orms.map((orm) => ({
      id: orm.id,
      projectId: orm.projectId,
      name: orm.name,
      date: orm.date,
      amount: Number(orm.amount),
      issuerName: orm.issuerName,
      issuerTaxId: orm.issuerTaxId,
      invoiceNumber: orm.invoiceNumber,
    }));
  }
}
