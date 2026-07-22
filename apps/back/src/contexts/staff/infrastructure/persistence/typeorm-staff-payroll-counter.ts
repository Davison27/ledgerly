import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { StaffPayrollCounter } from '../../domain/staff-payroll-counter.port';

@Injectable()
export class TypeOrmStaffPayrollCounter implements StaffPayrollCounter {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async count(staffMemberId: string): Promise<number> {
    const rows: unknown = await this.dataSource.query(
      'SELECT count(*)::int AS count FROM documents WHERE staff_member_id = $1',
      [staffMemberId],
    );

    return Array.isArray(rows) && rows.length > 0 ? Number((rows[0] as { count: number }).count) : 0;
  }
}
