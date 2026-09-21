import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EquipmentReferenceCounter } from '../../domain/equipment-reference-counter.port';

@Injectable()
export class TypeOrmEquipmentReferenceCounter implements EquipmentReferenceCounter {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async count(equipmentId: string): Promise<number> {
    const rows: unknown = await this.dataSource.query(
      `SELECT (
         (SELECT count(*) FROM project_equipment WHERE equipment_id = $1) +
         (SELECT count(*) FROM schedule_event_equipment WHERE equipment_id = $1)
       )::int AS count`,
      [equipmentId],
    );

    return Array.isArray(rows) && rows.length > 0 ? Number((rows[0] as { count: number }).count) : 0;
  }
}
