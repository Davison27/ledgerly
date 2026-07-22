import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { StaffMemberExistenceChecker } from '../../domain/staff-member-existence-checker.port';

@Injectable()
export class TypeOrmStaffMemberExistenceChecker implements StaffMemberExistenceChecker {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async exists(staffMemberId: string): Promise<boolean> {
    const rows: unknown = await this.dataSource.query(
      'SELECT 1 FROM staff_members WHERE id = $1 LIMIT 1',
      [staffMemberId],
    );

    return Array.isArray(rows) && rows.length > 0;
  }
}
