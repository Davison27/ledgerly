import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  ScheduleEquipmentEditorOption,
  ScheduleEquipmentEditorReader,
  ScheduleEquipmentReader,
  ScheduleEquipmentView,
} from '../../domain/schedule-equipment-reader.port';
import { getListLimit, ListLimitExceededException } from '../../../../shared/infrastructure/list-limit';

@Injectable()
export class TypeOrmScheduleEquipmentReader implements ScheduleEquipmentReader, ScheduleEquipmentEditorReader {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findByIds(ids: string[]): Promise<ScheduleEquipmentView[]> {
    if (ids.length === 0) {
      return [];
    }

    const rows: unknown = await this.dataSource.query(
      `SELECT id, name, stock FROM equipment WHERE id = ANY($1)`,
      [ids],
    );

    return rows as ScheduleEquipmentView[];
  }

  async findEditorOptions(): Promise<ScheduleEquipmentEditorOption[]> {
    const limit = getListLimit('MAX_LIST_ITEMS', 500);
    const rows: ScheduleEquipmentEditorOption[] = await this.dataSource.query(
      `SELECT id, name AS "displayName"
       FROM equipment WHERE archived_at IS NULL ORDER BY name ASC LIMIT $1`,
      [limit + 1],
    );

    if (rows.length > limit) {
      throw new ListLimitExceededException(limit, 'Calendar editor equipment');
    }

    return rows;
  }

  async findEditorLabelsByIds(ids: string[]): Promise<ScheduleEquipmentEditorOption[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.dataSource.query(
      `SELECT id, name AS "displayName" FROM equipment WHERE id = ANY($1)`,
      [ids],
    );
  }
}
