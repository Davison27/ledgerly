import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';

export class ScheduleEventNotFoundException extends EntityNotFoundException {
  constructor(id: string) {
    super('ScheduleEvent', id);
  }
}
