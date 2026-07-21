import { UniqueConstraintException } from '../../../../shared/domain/unique-constraint.exception';

export class ProductNameAlreadyExistsException extends UniqueConstraintException {
  constructor(name: string) {
    super('Product', 'name', name);
  }
}
