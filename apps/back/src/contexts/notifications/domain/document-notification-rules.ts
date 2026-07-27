import { NotificationDraft } from './notification-draft';
import { NotificationDocumentRow } from './notification-document-reader.port';
import { NotificationType } from './notification-type';
import { buildDedupeKey } from './dedupe-key';

function buildDueNotification(row: NotificationDocumentRow, dueDate: string, today: string): NotificationDraft {
  const isOverdue = dueDate < today;
  const type: NotificationType = isOverdue ? 'document_overdue' : 'document_due_soon';

  return {
    dedupeKey: buildDedupeKey(type, row.id),
    type,
    severity: isOverdue ? 'error' : 'warning',
    context: {
      subject: row.name,
      related: null,
      date: dueDate,
      amount: row.amount,
      conflictKind: null,
    },
    resource: { kind: 'document', id: row.id, projectId: row.projectId },
  };
}

export function buildDueNotifications(rows: NotificationDocumentRow[], today: string): NotificationDraft[] {
  return rows
    .filter((row): row is NotificationDocumentRow & { dueDate: string } => row.dueDate !== null)
    .map((row) => buildDueNotification(row, row.dueDate, today));
}

export function buildIncompleteNotifications(rows: NotificationDocumentRow[]): NotificationDraft[] {
  return rows.map((row) => ({
    dedupeKey: buildDedupeKey('document_incomplete', row.id),
    type: 'document_incomplete',
    severity: 'info',
    context: {
      subject: row.name,
      related: null,
      date: null,
      amount: row.amount,
      conflictKind: null,
    },
    resource: { kind: 'document', id: row.id, projectId: row.projectId },
  }));
}
