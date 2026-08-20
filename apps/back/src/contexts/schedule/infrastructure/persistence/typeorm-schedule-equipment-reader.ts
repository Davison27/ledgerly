import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ScheduleEquipmentReader, ScheduleEquipmentView } from '../../domain/schedule-equipment-reader.port';

@Injectable()
export class TypeOrmScheduleEquipmentReader implements ScheduleEquipmentReader {
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
}
