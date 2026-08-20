import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';

export class ScheduleEquipmentNotFoundException extends EntityNotFoundException {
  constructor(id: string) {
    super('Equipment', id);
  }
}
