import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';

export class DocumentNotFoundException extends EntityNotFoundException {
  constructor(id: string) {
    super('Document', id);
  }
}
