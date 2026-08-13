import { Inject, Injectable } from '@nestjs/common';
import { SupplierSummary } from '../../domain/supplier-summary';
import {
  SUPPLIER_SPEND_PROVIDER,
  SupplierSpendProvider,
  SupplierSpendRow,
} from '../../domain/supplier-spend-provider.port';
import {
  SUPPLIER_REPOSITORY,
  SupplierRepository,
} from '../../domain/supplier.repository';

@Injectable()
export class ListSuppliersUseCase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: SupplierRepository,
    @Inject(SUPPLIER_SPEND_PROVIDER)
    private readonly supplierSpendProvider: SupplierSpendProvider,
  ) {}

  async execute(): Promise<SupplierSummary[]> {
    const [suppliers, spendRows] = await Promise.all([
      this.supplierRepository.findAll(),
      this.supplierSpendProvider.findAll(),
    ]);
    const rowsBySupplier = new Map<string, SupplierSpendRow[]>();

    for (const row of spendRows) {
      const rows = rowsBySupplier.get(row.supplierId) ?? [];
      rows.push(row);
      rowsBySupplier.set(row.supplierId, rows);
    }

    return suppliers.map((supplier) => {
      const rows = rowsBySupplier.get(supplier.id) ?? [];

      return {
        ...supplier.toPrimitives(),
        documentCount: rows.reduce((count, row) => count + row.documentCount, 0),
        spend: rows
          .filter((row) => row.total > 0)
          .sort((rowA, rowB) => rowA.currency.localeCompare(rowB.currency))
          .map((row) => ({ currency: row.currency, total: row.total })),
      };
    });
  }
}
