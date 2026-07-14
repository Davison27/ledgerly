import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';

export class ProjectNotFoundException extends EntityNotFoundException {
  constructor(id: string) {
    super('Project', id);
  }
}
