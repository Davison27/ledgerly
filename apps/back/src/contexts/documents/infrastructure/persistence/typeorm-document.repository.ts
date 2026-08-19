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
import { DocumentDirection } from '../../domain/document-direction';
import { DocumentCurrency } from '../../domain/document-currency';
import { todayIso } from '../../../../shared/infrastructure/system-clock';
import { Page, PageRequest, pageOffset } from '../../../../shared/domain/pagination';
import { DocumentOrmEntity } from './document.orm-entity';
import { DocumentMapper } from './document.mapper';
import { getListLimit, ListLimitExceededException } from '../../../../shared/infrastructure/list-limit';

const EFFECTIVE_STATUS_FILTER_SQL = `
  CASE WHEN document.status = 'pendiente' AND document.due_date IS NOT NULL AND document.due_date < :today
       THEN 'vencido' ELSE document.status END = :status
`;

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
      queryBuilder.andWhere(EFFECTIVE_STATUS_FILTER_SQL, { status: filters.status, today: todayIso() });
    }

    if (filters.direction) {
      queryBuilder.andWhere('document.direction = :direction', { direction: filters.direction });
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

    const limit = getListLimit('MAX_LIST_ITEMS', 500);
    queryBuilder.orderBy('document.date', 'DESC').addOrderBy('document.id', 'DESC').take(limit + 1);

    const orms = await queryBuilder.getMany();
    if (orms.length > limit) throw new ListLimitExceededException(limit, 'Project documents');

    return orms.map((orm) => DocumentMapper.toDomain(orm));
  }

  async findPageByProject(
    projectId: string,
    filters: DocumentFilters,
    request: PageRequest,
  ): Promise<Page<Document>> {
    const queryBuilder = this.repository
      .createQueryBuilder('document')
      .where('document.project_id = :projectId', { projectId });

    this.applyDocumentFilters(queryBuilder, filters);

    const total = await queryBuilder.getCount();
    const orms = await queryBuilder
      .orderBy('document.date', 'DESC')
      .addOrderBy('document.id', 'DESC')
      .skip(pageOffset(request))
      .take(request.size)
      .getMany();

    return {
      items: orms.map((orm) => DocumentMapper.toDomain(orm)),
      total,
      page: request.page,
      size: request.size,
    };
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
        direction: true,
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
      direction: orm.direction as DocumentDirection,
    }));
  }

  async findAllForListing(filters: DocumentListFilters): Promise<DocumentListRow[]> {
    const queryBuilder = this.repository.createQueryBuilder('document');
    this.applyDocumentFilters(queryBuilder, filters);

    const limit = getListLimit('MAX_LIST_ITEMS', 500);
    queryBuilder.orderBy('document.date', 'DESC').addOrderBy('document.id', 'DESC').take(limit + 1);

    const orms = await queryBuilder.getMany();
    if (orms.length > limit) throw new ListLimitExceededException(limit, 'Documents');

    return orms.map((orm) => ({
      id: orm.id,
      projectId: orm.projectId,
      name: orm.name,
      type: orm.type as DocumentType,
      status: orm.status as DocumentStatus,
      direction: orm.direction as DocumentDirection,
      date: orm.date,
      dueDate: orm.dueDate,
      amount: Number(orm.amount),
      currency: orm.currency as DocumentCurrency,
      issuerName: orm.issuerName,
      invoiceNumber: orm.invoiceNumber,
      supplierId: orm.supplierId,
      staffMemberId: orm.staffMemberId,
    }));
  }

  async findPageForListing(
    filters: DocumentListFilters,
    request: PageRequest,
  ): Promise<Page<DocumentListRow>> {
    const queryBuilder = this.repository.createQueryBuilder('document');
    this.applyDocumentFilters(queryBuilder, filters);

    const total = await queryBuilder.getCount();
    const orms = await queryBuilder
      .orderBy('document.date', 'DESC')
      .addOrderBy('document.id', 'DESC')
      .skip(pageOffset(request))
      .take(request.size)
      .getMany();

    return {
      items: orms.map((orm) => this.toDocumentListRow(orm)),
      total,
      page: request.page,
      size: request.size,
    };
  }

  async findPossibleDuplicates(criteria: DocumentDuplicateCriteria): Promise<DocumentDuplicateRow[]> {
    const limit = getListLimit('MAX_LIST_ITEMS', 500);
    const orms = await this.repository
      .createQueryBuilder('document')
      .where('LOWER(TRIM(document.invoice_number)) = :invoiceNumber', {
        invoiceNumber: criteria.invoiceNumber.trim().toLowerCase(),
      })
      .andWhere('document.amount = :amount', { amount: criteria.amount })
      .orderBy('document.date', 'DESC')
      .addOrderBy('document.id', 'DESC')
      .take(limit + 1)
      .getMany();

    if (orms.length > limit) throw new ListLimitExceededException(limit, 'Duplicate document matches');

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

  async findPagePossibleDuplicates(
    criteria: DocumentDuplicateCriteria,
    request: PageRequest,
  ): Promise<Page<DocumentDuplicateRow>> {
    const queryBuilder = this.repository
      .createQueryBuilder('document')
      .where('LOWER(TRIM(document.invoice_number)) = :invoiceNumber', {
        invoiceNumber: criteria.invoiceNumber.trim().toLowerCase(),
      })
      .andWhere('document.amount = :amount', { amount: criteria.amount });

    const issuerConditions: string[] = [];
    const issuerParameters: Record<string, string> = {};
    if (criteria.issuerTaxId) {
      issuerConditions.push("UPPER(REPLACE(document.issuer_tax_id, '-', '')) = :issuerTaxId");
      issuerParameters.issuerTaxId = criteria.issuerTaxId.toUpperCase().replace(/-/g, '');
    }
    if (criteria.issuerName) {
      issuerConditions.push(
        "UPPER(REGEXP_REPLACE(TRIM(document.issuer_name), '\\s+', ' ', 'g')) = :issuerName",
      );
      issuerParameters.issuerName = criteria.issuerName.trim().replace(/\s+/g, ' ').toUpperCase();
    }
    if (issuerConditions.length > 0) {
      queryBuilder.andWhere(`(${issuerConditions.join(' OR ')})`, issuerParameters);
    }

    const total = await queryBuilder.getCount();
    const orms = await queryBuilder
      .orderBy('document.date', 'DESC')
      .addOrderBy('document.id', 'DESC')
      .skip(pageOffset(request))
      .take(request.size)
      .getMany();

    return {
      items: orms.map((orm) => ({
        id: orm.id,
        projectId: orm.projectId,
        name: orm.name,
        date: orm.date,
        amount: Number(orm.amount),
        issuerName: orm.issuerName,
        issuerTaxId: orm.issuerTaxId,
        invoiceNumber: orm.invoiceNumber,
      })),
      total,
      page: request.page,
      size: request.size,
    };
  }

  private applyDocumentFilters(
    queryBuilder: ReturnType<Repository<DocumentOrmEntity>['createQueryBuilder']>,
    filters: DocumentFilters,
  ): void {
    const listFilters = filters as DocumentListFilters;

    if (listFilters.projectId) {
      queryBuilder.andWhere('document.project_id = :projectId', { projectId: listFilters.projectId });
    }

    if (listFilters.supplierId) {
      queryBuilder.andWhere('document.supplier_id = :supplierId', { supplierId: listFilters.supplierId });
    }

    if (listFilters.staffMemberId) {
      queryBuilder.andWhere('document.staff_member_id = :staffMemberId', {
        staffMemberId: listFilters.staffMemberId,
      });
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
      queryBuilder.andWhere(EFFECTIVE_STATUS_FILTER_SQL, { status: filters.status, today: todayIso() });
    }

    if (filters.direction) {
      queryBuilder.andWhere('document.direction = :direction', { direction: filters.direction });
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
  }

  private toDocumentListRow(orm: DocumentOrmEntity): DocumentListRow {
    return {
      id: orm.id,
      projectId: orm.projectId,
      name: orm.name,
      type: orm.type as DocumentType,
      status: orm.status as DocumentStatus,
      direction: orm.direction as DocumentDirection,
      date: orm.date,
      dueDate: orm.dueDate,
      amount: Number(orm.amount),
      currency: orm.currency as DocumentCurrency,
      issuerName: orm.issuerName,
      invoiceNumber: orm.invoiceNumber,
      supplierId: orm.supplierId,
      staffMemberId: orm.staffMemberId,
    };
  }
}
