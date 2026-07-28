import { NotificationDraft } from './notification-draft';
import { NotificationStaffDocumentRow } from './notification-staff-reader.port';
import { NotificationType } from './notification-type';
import { buildDedupeKey } from './dedupe-key';

export function buildStaffDocumentNotifications(
  rows: NotificationStaffDocumentRow[],
  today: string,
): NotificationDraft[] {
  return rows.map((row) => {
    const isExpired = row.expiryDate < today;
    const type: NotificationType = isExpired ? 'staff_document_expired' : 'staff_document_expiring';

    return {
      dedupeKey: buildDedupeKey(type, row.id),
      type,
      severity: isExpired ? 'error' : 'warning',
      context: {
        subject: row.name,
        related: row.staffMemberName,
        date: row.expiryDate,
        amount: null,
        conflictKind: null,
      },
      resource: { kind: 'staff_member', id: row.staffMemberId, projectId: null },
    };
  });
}
