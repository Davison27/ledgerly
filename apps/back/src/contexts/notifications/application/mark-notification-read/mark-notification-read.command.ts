import { NotificationAccessSnapshot } from '../../domain/notification-access';

export interface MarkNotificationReadCommand {
  id: string;
  access: NotificationAccessSnapshot;
}
