import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';

export class NotificationNotFoundException extends EntityNotFoundException {
  constructor(id: string) {
    super('Notification', id);
  }
}
