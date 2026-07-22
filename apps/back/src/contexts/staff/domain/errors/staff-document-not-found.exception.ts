import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';

export class StaffDocumentNotFoundException extends EntityNotFoundException {
  constructor(id: string) {
    super('StaffDocument', id);
  }
}
