import { describe, expect, it } from 'vitest';
import { supplierDeletionMessageKey, visibleSuppliers } from './suppliersPage';

describe('suppliers page model', () => {
  it('hides archived suppliers by default and maps archive outcomes', () => {
    const suppliers = [
      { id: 'active', name: 'Active', documentCount: 0, spend: [] },
      { id: 'archived', name: 'Archived', archivedAt: '2026-01-01T00:00:00.000Z', documentCount: 1, spend: [] },
    ];

    expect(visibleSuppliers(suppliers, false).map((supplier) => supplier.id)).toEqual(['active']);
    expect(supplierDeletionMessageKey('archived')).toBe('suppliers.archived');
  });
});
