import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SupplierExistenceChecker } from '../../domain/supplier-existence-checker.port';

@Injectable()
export class TypeOrmSupplierExistenceChecker implements SupplierExistenceChecker {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async exists(supplierId: string): Promise<boolean> {
    const rows: unknown = await this.dataSource.query(
      'SELECT 1 FROM suppliers WHERE id = $1 LIMIT 1',
      [supplierId],
    );

    return Array.isArray(rows) && rows.length > 0;
  }
}
