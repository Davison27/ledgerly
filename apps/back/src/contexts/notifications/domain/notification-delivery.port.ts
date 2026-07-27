import { Notification } from './notification';

export const NOTIFICATION_DELIVERY = Symbol('NotificationDelivery');

export interface NotificationDelivery {
  deliver(notifications: Notification[]): Promise<void>;
}
