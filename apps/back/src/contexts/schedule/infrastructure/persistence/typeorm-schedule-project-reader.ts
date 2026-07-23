import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ScheduleProjectReader, ScheduleProjectView } from '../../domain/schedule-project-reader.port';

@Injectable()
export class TypeOrmScheduleProjectReader implements ScheduleProjectReader {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findActive(): Promise<ScheduleProjectView[]> {
    const rows: unknown = await this.dataSource.query(
      `SELECT id, name, code, image, status, start_date::text AS "startDate", end_date::text AS "endDate"
       FROM projects WHERE status = 'active' ORDER BY name ASC`,
    );

    return rows as ScheduleProjectView[];
  }

  async findByIds(ids: string[]): Promise<ScheduleProjectView[]> {
    if (ids.length === 0) {
      return [];
    }

    const rows: unknown = await this.dataSource.query(
      `SELECT id, name, code, image, status, start_date::text AS "startDate", end_date::text AS "endDate"
       FROM projects WHERE id = ANY($1)`,
      [ids],
    );

    return rows as ScheduleProjectView[];
  }
}
