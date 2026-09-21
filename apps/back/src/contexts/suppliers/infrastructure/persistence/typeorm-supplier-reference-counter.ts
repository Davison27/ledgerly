import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SupplierReferenceCounter } from '../../domain/supplier-reference-counter.port';

@Injectable()
export class TypeOrmSupplierReferenceCounter implements SupplierReferenceCounter {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async count(supplierId: string): Promise<number> {
    const rows: unknown = await this.dataSource.query(
      'SELECT count(*)::int AS count FROM documents WHERE supplier_id = $1',
      [supplierId],
    );

    return Array.isArray(rows) && rows.length > 0 ? Number((rows[0] as { count: number }).count) : 0;
  }
}
