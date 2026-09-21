import { describe, expect, it } from 'vitest';
import { staffDeletionMessageKey, visibleStaffMembers } from './staffPage';

describe('staff page model', () => {
  it('hides archived staff by default and maps archive outcomes', () => {
    const staffMembers = [
      { id: 'active', firstName: 'Active', lastName: 'Member', documentCount: 0, documentStatus: 'none' as const, earliestExpiryDate: null },
      { id: 'archived', firstName: 'Archived', lastName: 'Member', archivedAt: '2026-01-01T00:00:00.000Z', documentCount: 0, documentStatus: 'none' as const, earliestExpiryDate: null },
    ];

    expect(visibleStaffMembers(staffMembers, false).map((member) => member.id)).toEqual(['active']);
    expect(staffDeletionMessageKey('archived')).toBe('staff.archived');
  });
});
