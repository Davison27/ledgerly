import { buildStaffDocumentNotifications } from './staff-notification-rules';
import { NotificationStaffDocumentRow } from './notification-staff-reader.port';

function buildRow(overrides: Partial<NotificationStaffDocumentRow> = {}): NotificationStaffDocumentRow {
  return {
    id: 'staff-doc-1',
    staffMemberId: 'staff-1',
    staffMemberName: 'Ana García',
    name: 'DNI',
    expiryDate: '2026-07-01',
    ...overrides,
  };
}

describe('buildStaffDocumentNotifications', () => {
  it('classifies an expiry date before today as expired', () => {
    const [draft] = buildStaffDocumentNotifications([buildRow({ expiryDate: '2026-07-01' })], '2026-07-18');

    expect(draft.type).toBe('staff_document_expired');
    expect(draft.severity).toBe('error');
    expect(draft.dedupeKey).toBe('staff_document_expired:staff-doc-1');
  });

  it('classifies an expiry date on or after today as expiring', () => {
    const [draft] = buildStaffDocumentNotifications([buildRow({ expiryDate: '2026-07-18' })], '2026-07-18');

    expect(draft.type).toBe('staff_document_expiring');
    expect(draft.severity).toBe('warning');
    expect(draft.dedupeKey).toBe('staff_document_expiring:staff-doc-1');
  });

  it('uses the document name as subject and the staff member name as related', () => {
    const [draft] = buildStaffDocumentNotifications([buildRow()], '2026-07-18');

    expect(draft.context.subject).toBe('DNI');
    expect(draft.context.related).toBe('Ana García');
    expect(draft.resource).toEqual({ kind: 'staff_member', id: 'staff-1', projectId: null });
  });
});
