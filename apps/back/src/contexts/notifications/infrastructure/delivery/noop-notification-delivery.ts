import { Injectable } from '@nestjs/common';
import { NotificationDelivery } from '../../domain/notification-delivery.port';

@Injectable()
export class NoopNotificationDelivery implements NotificationDelivery {
  deliver(): Promise<void> {
    return Promise.resolve();
  }
}
