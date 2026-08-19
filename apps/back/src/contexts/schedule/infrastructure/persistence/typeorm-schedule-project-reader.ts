import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  ScheduleProjectReader,
  ScheduleProjectView,
  SchedulableProjectView,
} from '../../domain/schedule-project-reader.port';
import { getListLimit, ListLimitExceededException } from '../../../../shared/infrastructure/list-limit';

@Injectable()
export class TypeOrmScheduleProjectReader implements ScheduleProjectReader {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findActive(): Promise<SchedulableProjectView[]> {
    const limit = getListLimit('MAX_LIST_ITEMS', 500);
    const rows: unknown = await this.dataSource.query(
      `SELECT p.id, p.name, p.code, p.image, p.status, p.color,
              p.start_date::text AS "startDate", p.end_date::text AS "endDate",
              EXISTS (SELECT 1 FROM schedule_events se WHERE se.project_id = p.id) AS "hasEvents"
       FROM projects p WHERE p.status = 'active' ORDER BY p.name ASC LIMIT $1`,
      [limit + 1],
    );

    if ((rows as SchedulableProjectView[]).length > limit) {
      throw new ListLimitExceededException(limit, 'Schedulable projects');
    }

    return rows as SchedulableProjectView[];
  }

  async findByIds(ids: string[]): Promise<ScheduleProjectView[]> {
    if (ids.length === 0) {
      return [];
    }

    const rows: unknown = await this.dataSource.query(
      `SELECT id, name, code, image, status, color, start_date::text AS "startDate", end_date::text AS "endDate"
       FROM projects WHERE id = ANY($1)`,
      [ids],
    );

    return rows as ScheduleProjectView[];
  }
}
