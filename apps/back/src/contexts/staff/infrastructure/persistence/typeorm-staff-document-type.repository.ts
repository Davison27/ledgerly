import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffDocumentType } from '../../domain/staff-document-type';
import { StaffDocumentTypeRepository } from '../../domain/staff-document-type.repository';
import { StaffDocumentTypeOrmEntity } from './staff-document-type.orm-entity';
import { StaffDocumentTypeMapper } from './staff-document-type.mapper';
import { getListLimit, ListLimitExceededException } from '../../../../shared/infrastructure/list-limit';

@Injectable()
export class TypeOrmStaffDocumentTypeRepository implements StaffDocumentTypeRepository {
  constructor(
    @InjectRepository(StaffDocumentTypeOrmEntity)
    private readonly repository: Repository<StaffDocumentTypeOrmEntity>,
  ) {}

  async findAll(): Promise<StaffDocumentType[]> {
    const limit = getListLimit('MAX_LIST_ITEMS', 500);
    const rows = await this.repository.find({ order: { name: 'ASC' }, take: limit + 1 });

    if (rows.length > limit) throw new ListLimitExceededException(limit, 'Staff document types');

    return rows.map((row) => StaffDocumentTypeMapper.toDomain(row));
  }

  async findById(id: string): Promise<StaffDocumentType | null> {
    const orm = await this.repository.findOne({ where: { id } });

    return orm !== null ? StaffDocumentTypeMapper.toDomain(orm) : null;
  }
}
