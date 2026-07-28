import { NotificationConflictKind } from './notification-conflict-kind';

export interface NotificationContext {
  subject: string;
  related: string | null;
  date: string | null;
  amount: number | null;
  conflictKind: NotificationConflictKind | null;
}
