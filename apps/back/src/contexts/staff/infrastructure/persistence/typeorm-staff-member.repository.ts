import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffMember } from '../../domain/staff-member';
import { StaffMemberRepository } from '../../domain/staff-member.repository';
import { StaffMemberOrmEntity } from './staff-member.orm-entity';
import { StaffMemberMapper } from './staff-member.mapper';

@Injectable()
export class TypeOrmStaffMemberRepository implements StaffMemberRepository {
  private readonly mapper = new StaffMemberMapper();

  constructor(
    @InjectRepository(StaffMemberOrmEntity)
    private readonly repository: Repository<StaffMemberOrmEntity>,
  ) {}

  async findAll(): Promise<StaffMember[]> {
    const rows = await this.repository.find({ order: { lastName: 'ASC', firstName: 'ASC' } });

    return rows.map((row) => this.mapper.toDomain(row));
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
