import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';

export class DocumentStaffMemberNotFoundException extends EntityNotFoundException {
  constructor(staffMemberId: string) {
    super('StaffMember', staffMemberId);
  }
}
