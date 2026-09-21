import { UniqueConstraintException } from '../../../../shared/domain/unique-constraint.exception';

export class ClientTaxIdAlreadyExistsException extends UniqueConstraintException {
  constructor(taxId: string) {
    super('Client', 'taxId', taxId);
  }
}
