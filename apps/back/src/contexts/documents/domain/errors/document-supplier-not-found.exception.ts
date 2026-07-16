import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';

export class DocumentSupplierNotFoundException extends EntityNotFoundException {
  constructor(supplierId: string) {
    super('Supplier', supplierId);
  }
}
