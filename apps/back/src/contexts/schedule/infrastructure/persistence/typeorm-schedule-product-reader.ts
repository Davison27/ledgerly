import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ScheduleProductReader, ScheduleProductView } from '../../domain/schedule-product-reader.port';

@Injectable()
export class TypeOrmScheduleProductReader implements ScheduleProductReader {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findByIds(ids: string[]): Promise<ScheduleProductView[]> {
    if (ids.length === 0) {
      return [];
    }

    const rows: unknown = await this.dataSource.query(
      `SELECT id, name, stock FROM products WHERE id = ANY($1)`,
      [ids],
    );

    return rows as ScheduleProductView[];
  }
}
