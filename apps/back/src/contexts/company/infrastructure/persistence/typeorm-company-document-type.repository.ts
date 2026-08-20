import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getListLimit, ListLimitExceededException } from '../../../../shared/infrastructure/list-limit';
import { CompanyDocumentType } from '../../domain/company-document-type';
import { CompanyDocumentTypeRepository } from '../../domain/company-document-type.repository';
import { CompanyDocumentTypeMapper } from './company-document-type.mapper';
import { CompanyDocumentTypeOrmEntity } from './company-document-type.orm-entity';

@Injectable()
export class TypeOrmCompanyDocumentTypeRepository implements CompanyDocumentTypeRepository {
  constructor(
    @InjectRepository(CompanyDocumentTypeOrmEntity)
    private readonly repository: Repository<CompanyDocumentTypeOrmEntity>,
  ) {}

  async findAll(): Promise<CompanyDocumentType[]> {
    const limit = getListLimit('MAX_LIST_ITEMS', 500);
    const rows = await this.repository.find({ order: { name: 'ASC' }, take: limit + 1 });

    if (rows.length > limit) throw new ListLimitExceededException(limit, 'Company document types');

    return rows.map((row) => CompanyDocumentTypeMapper.toDomain(row));
  }

  async findById(id: string): Promise<CompanyDocumentType | null> {
    const row = await this.repository.findOne({ where: { id } });

    return row === null ? null : CompanyDocumentTypeMapper.toDomain(row);
  }
}
