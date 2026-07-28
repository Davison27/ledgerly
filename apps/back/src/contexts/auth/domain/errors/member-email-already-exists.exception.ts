import { UniqueConstraintException } from '../../../../shared/domain/unique-constraint.exception';

export class MemberEmailAlreadyExistsException extends UniqueConstraintException {
  constructor(email: string) {
    super('WorkspaceMember', 'email', email);
  }
}
