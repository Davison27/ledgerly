import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';

export class ProductNotFoundException extends EntityNotFoundException {
  constructor(id: string) {
    super('Product', id);
  }
}
