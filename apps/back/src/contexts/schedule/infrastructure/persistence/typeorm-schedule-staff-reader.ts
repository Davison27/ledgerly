import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  ScheduleStaffEditorOption,
  ScheduleStaffEditorReader,
  ScheduleStaffReader,
  ScheduleStaffView,
} from '../../domain/schedule-staff-reader.port';
import { getListLimit, ListLimitExceededException } from '../../../../shared/infrastructure/list-limit';

@Injectable()
export class TypeOrmScheduleStaffReader implements ScheduleStaffReader, ScheduleStaffEditorReader {
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

  async findEditorOptions(): Promise<ScheduleStaffEditorOption[]> {
    const limit = getListLimit('MAX_LIST_ITEMS', 500);
    const rows: ScheduleStaffEditorOption[] = await this.dataSource.query(
      `SELECT id, first_name || ' ' || last_name AS "displayName"
       FROM staff_members WHERE archived_at IS NULL
       ORDER BY first_name ASC, last_name ASC LIMIT $1`,
      [limit + 1],
    );

    if (rows.length > limit) {
      throw new ListLimitExceededException(limit, 'Calendar editor staff');
    }

    return rows;
  }

  async findEditorLabelsByIds(ids: string[]): Promise<ScheduleStaffEditorOption[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.dataSource.query(
      `SELECT id, first_name || ' ' || last_name AS "displayName"
       FROM staff_members WHERE id = ANY($1)`,
      [ids],
    );
  }
}
