import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  SupplierSpendProvider,
  SupplierSpendRow,
} from '../../domain/supplier-spend-provider.port';

@Injectable()
export class DocumentSupplierSpendProvider implements SupplierSpendProvider {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findAll(): Promise<SupplierSpendRow[]> {
    const rows: Record<string, unknown>[] = await this.dataSource.query(`
      SELECT supplier_id AS "supplierId", currency,
             COALESCE(SUM(amount) FILTER (WHERE direction = 'gasto'), 0) AS total,
             COUNT(*)::int AS "documentCount"
      FROM documents
      WHERE supplier_id IS NOT NULL
      GROUP BY supplier_id, currency
    `);

    return rows.map((row) => ({
      supplierId: String(row.supplierId),
      currency: String(row.currency),
      total: Number(row.total),
      documentCount: Number(row.documentCount),
    }));
  }
}
