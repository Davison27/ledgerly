import { NotificationType } from '../../domain/notification-type';
import { NotificationSeverity } from '../../domain/notification-severity';
import { NotificationConflictKind } from '../../domain/notification-conflict-kind';
import { NotificationResourceKind } from '../../domain/notification-resource';
import { NotificationListRow } from '../../domain/notification-list-row';

export class NotificationResourceResponse {
  kind: NotificationResourceKind;
  id: string | null;
  projectId: string | null;
}

export class NotificationContextResponse {
  subject: string;
  related: string | null;
  date: string | null;
  amount: number | null;
  conflictKind: NotificationConflictKind | null;
}

export class NotificationResponse {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  createdAt: string;
  readAt: string | null;
  resource: NotificationResourceResponse;
  context: NotificationContextResponse;

  static fromRow(row: NotificationListRow): NotificationResponse {
    const response = new NotificationResponse();

    response.id = row.id;
    response.type = row.type;
    response.severity = row.severity;
    response.createdAt = row.createdAt.toISOString();
    response.readAt = row.readAt ? row.readAt.toISOString() : null;
    response.resource = {
      kind: row.resourceKind,
      id: row.resourceId,
      projectId: row.resourceProjectId,
    };
    response.context = {
      subject: row.subject,
      related: row.related,
      date: row.date,
      amount: row.amount,
      conflictKind: row.conflictKind,
    };

    return response;
  }
}
