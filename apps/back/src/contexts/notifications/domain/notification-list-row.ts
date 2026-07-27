import { NotificationType } from './notification-type';
import { NotificationSeverity } from './notification-severity';
import { NotificationConflictKind } from './notification-conflict-kind';
import { NotificationResourceKind } from './notification-resource';

export interface NotificationListRow {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  subject: string;
  related: string | null;
  date: string | null;
  amount: number | null;
  conflictKind: NotificationConflictKind | null;
  resourceKind: NotificationResourceKind;
  resourceId: string | null;
  resourceProjectId: string | null;
  createdAt: Date;
  readAt: Date | null;
}
