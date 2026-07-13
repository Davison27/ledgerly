import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';

export class DocumentProjectNotFoundException extends EntityNotFoundException {
  constructor(projectId: string) {
    super('Project', projectId);
  }
}
