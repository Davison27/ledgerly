import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';

export class StaffDocumentTypeNotFoundException extends EntityNotFoundException {
  constructor(id: string) {
    super('StaffDocumentType', id);
  }
}
