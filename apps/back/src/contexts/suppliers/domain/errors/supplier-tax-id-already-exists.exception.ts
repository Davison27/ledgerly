import { UniqueConstraintException } from '../../../../shared/domain/unique-constraint.exception';

export class SupplierTaxIdAlreadyExistsException extends UniqueConstraintException {
  constructor(taxId: string) {
    super('Supplier', 'taxId', taxId);
  }
}
