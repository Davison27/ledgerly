import { UniqueConstraintException } from '../../../../shared/domain/unique-constraint.exception';

export class EquipmentNameAlreadyExistsException extends UniqueConstraintException {
  constructor(name: string) {
    super('Equipment', 'name', name);
  }
}
