import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffMember } from '../../domain/staff-member';
import {
  StaffMemberRepository,
  StaffMemberSummaryRow,
} from '../../domain/staff-member.repository';
import { StaffMemberOrmEntity } from './staff-member.orm-entity';
import { StaffMemberMapper } from './staff-member.mapper';
import { getListLimit, ListLimitExceededException } from '../../../../shared/infrastructure/list-limit';

@Injectable()
export class TypeOrmStaffMemberRepository implements StaffMemberRepository {
  private readonly mapper = new StaffMemberMapper();

  constructor(
    @InjectRepository(StaffMemberOrmEntity)
    private readonly repository: Repository<StaffMemberOrmEntity>,
  ) {}

  async findAll(): Promise<StaffMember[]> {
    const limit = getListLimit('MAX_LIST_ITEMS', 500);
    const rows = await this.repository.find({
      order: { lastName: 'ASC', firstName: 'ASC' },
      take: limit + 1,
    });

    if (rows.length > limit) throw new ListLimitExceededException(limit, 'Staff members');

    return rows.map((row) => this.mapper.toDomain(row));
  }

  async findAllSummaryRows(): Promise<StaffMemberSummaryRow[]> {
    const limit = getListLimit('MAX_LIST_ITEMS', 500);
    const rows: StaffMemberSummaryRow[] = await this.repository.manager.query(`
      SELECT s.id, s.first_name AS "firstName", s.last_name AS "lastName",
             s.tax_id AS "taxId", s.email, s.phone, s.position,
             s.hire_date::text AS "hireDate", s.end_date::text AS "endDate", s.notes,
             COUNT(sd.id)::int AS "documentCount",
             MIN(sd.expiry_date)::text AS "earliestExpiryDate"
      FROM staff_members s
      LEFT JOIN staff_documents sd ON sd.staff_member_id = s.id
      GROUP BY s.id
      ORDER BY s.last_name ASC, s.first_name ASC
      LIMIT $1
    `, [limit + 1]);

    if (rows.length > limit) throw new ListLimitExceededException(limit, 'Staff members');

    return rows.map((row) => ({ ...row, documentCount: Number(row.documentCount) }));
  }

  async findById(id: string): Promise<StaffMember | null> {
    const orm = await this.repository.findOne({ where: { id } });

    return orm !== null ? this.mapper.toDomain(orm) : null;
  }

  async save(staffMember: StaffMember): Promise<void> {
    await this.repository.save(this.mapper.toOrm(staffMember));
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
