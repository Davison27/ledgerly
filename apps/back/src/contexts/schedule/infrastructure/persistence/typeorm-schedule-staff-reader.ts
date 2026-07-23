import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ScheduleStaffReader, ScheduleStaffView } from '../../domain/schedule-staff-reader.port';

@Injectable()
export class TypeOrmScheduleStaffReader implements ScheduleStaffReader {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findByIds(ids: string[]): Promise<ScheduleStaffView[]> {
    if (ids.length === 0) {
      return [];
    }

    const rows: unknown = await this.dataSource.query(
      `SELECT id, first_name AS "firstName", last_name AS "lastName",
              hire_date::text AS "hireDate", end_date::text AS "endDate"
       FROM staff_members WHERE id = ANY($1)`,
      [ids],
    );

    return rows as ScheduleStaffView[];
  }
}
