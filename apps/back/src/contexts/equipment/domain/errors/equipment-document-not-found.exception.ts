import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';

export class EquipmentDocumentNotFoundException extends EntityNotFoundException {
  constructor(id: string) {
    super('Equipment document', id);
  }
}
