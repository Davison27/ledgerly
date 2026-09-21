import type {
  SupplierDeletionOutcome,
  SupplierSummaryDto,
} from '@/entities/supplier';

export function isSupplierArchived(supplier: SupplierSummaryDto): boolean {
  return supplier.archivedAt !== null && supplier.archivedAt !== undefined;
}

export function visibleSuppliers(
  suppliers: SupplierSummaryDto[],
  showArchived: boolean,
): SupplierSummaryDto[] {
  return showArchived ? suppliers : suppliers.filter((supplier) => !isSupplierArchived(supplier));
}

export function supplierDeletionMessageKey(outcome: SupplierDeletionOutcome):
  | 'suppliers.deleted'
  | 'suppliers.archived' {
  return outcome === 'archived' ? 'suppliers.archived' : 'suppliers.deleted';
}
