import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';

export class InvoiceNotFoundException extends EntityNotFoundException {
  constructor(id: string) {
    super('Invoice', id);
  }
}
