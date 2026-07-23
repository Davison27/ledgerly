import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';

export class ScheduleProductNotFoundException extends EntityNotFoundException {
  constructor(id: string) {
    super('Product', id);
  }
}
