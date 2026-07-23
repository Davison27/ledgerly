import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';

export class ScheduleProjectNotFoundException extends EntityNotFoundException {
  constructor(id: string) {
    super('Project', id);
  }
}
