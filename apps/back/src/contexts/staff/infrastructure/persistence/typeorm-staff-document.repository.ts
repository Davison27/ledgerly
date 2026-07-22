import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffDocument } from '../../domain/staff-document';
import { StaffDocumentRepository } from '../../domain/staff-document.repository';
import { StaffDocumentOrmEntity } from './staff-document.orm-entity';
import { StaffDocumentMapper } from './staff-document.mapper';

@Injectable()
export class TypeOrmStaffDocumentRepository implements StaffDocumentRepository {
  constructor(
    @InjectRepository(StaffDocumentOrmEntity)
    private readonly repository: Repository<StaffDocumentOrmEntity>,
  ) {}

  async findByStaffMember(staffMemberId: string, typeId?: string): Promise<StaffDocument[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('staffDocument')
      .where('staffDocument.staff_member_id = :staffMemberId', { staffMemberId });

    if (typeId) {
      queryBuilder.andWhere('staffDocument.type_id = :typeId', { typeId });
    }

    queryBuilder.orderBy('staffDocument.issue_date', 'DESC');

    const orms = await queryBuilder.getMany();

    return orms.map((orm) => StaffDocumentMapper.toDomain(orm));
  }

  async findById(id: string): Promise<StaffDocument | null> {
    const orm = await this.repository.findOne({ where: { id } });

    return orm ? StaffDocumentMapper.toDomain(orm) : null;
  }

  async save(staffDocument: StaffDocument): Promise<void> {
    await this.repository.save(StaffDocumentMapper.toOrm(staffDocument));
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  async saveContent(staffDocumentId: string, content: Buffer): Promise<void> {
    await this.repository.update({ id: staffDocumentId }, { content });
  }

  async findContent(staffDocumentId: string): Promise<Buffer | null> {
    const orm = await this.repository
      .createQueryBuilder('staffDocument')
      .select(['staffDocument.id'])
      .addSelect('staffDocument.content')
      .where('staffDocument.id = :staffDocumentId', { staffDocumentId })
      .getOne();

    return orm?.content ?? null;
  }
}
