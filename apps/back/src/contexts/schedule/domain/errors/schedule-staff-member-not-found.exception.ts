import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';

export class ScheduleStaffMemberNotFoundException extends EntityNotFoundException {
  constructor(id: string) {
    super('StaffMember', id);
  }
}
