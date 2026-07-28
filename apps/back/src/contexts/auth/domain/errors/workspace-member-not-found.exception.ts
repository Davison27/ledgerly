import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';

export class WorkspaceMemberNotFoundException extends EntityNotFoundException {
  constructor(id: string) {
    super('WorkspaceMember', id);
  }
}
