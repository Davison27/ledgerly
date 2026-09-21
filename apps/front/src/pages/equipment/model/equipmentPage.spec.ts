import { describe, expect, it } from 'vitest';
import { equipmentDeletionMessageKey, visibleEquipment } from './equipmentPage';

describe('equipment page model', () => {
  it('hides archived equipment by default and maps archive outcomes', () => {
    const equipment = [
      { id: 'active', name: 'Active', price: null, stock: 1, reference: null, category: null, brand: null, description: null, image: null, tags: [], leasingMonthlyFee: null },
      { id: 'archived', name: 'Archived', price: null, stock: 1, reference: null, category: null, brand: null, description: null, image: null, tags: [], leasingMonthlyFee: null, archivedAt: '2026-01-01T00:00:00.000Z' },
    ];

    expect(visibleEquipment(equipment, false).map((item) => item.id)).toEqual(['active']);
    expect(equipmentDeletionMessageKey('archived')).toBe('equipment.archived');
  });
});
