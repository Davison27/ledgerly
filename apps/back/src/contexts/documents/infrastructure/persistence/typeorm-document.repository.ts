import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../../domain/document';
import { DocumentFilters } from '../../domain/document-filters';
import { DocumentRepository } from '../../domain/document.repository';
import { DocumentDashboardRow } from '../../domain/document-dashboard-row';
import { DocumentType } from '../../domain/document-type';
import { DocumentStatus } from '../../domain/document-status';
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
      },
    });

    return orms.map((orm) => ({
      type: orm.type as DocumentType,
      amount: Number(orm.amount),
      month: orm.month,
      status: orm.status as DocumentStatus,
      issuerName: orm.issuerName,
      projectId: orm.projectId,
    }));
  }
}
