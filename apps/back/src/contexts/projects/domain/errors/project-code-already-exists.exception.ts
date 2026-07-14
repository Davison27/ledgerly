import { UniqueConstraintException } from '../../../../shared/domain/unique-constraint.exception';

export class ProjectCodeAlreadyExistsException extends UniqueConstraintException {
  constructor(code: string) {
    super('Project', 'code', code);
  }
}
