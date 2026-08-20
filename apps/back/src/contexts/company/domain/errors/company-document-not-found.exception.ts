import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';

export class CompanyDocumentNotFoundException extends EntityNotFoundException {
  constructor(id: string) {
    super('CompanyDocument', id);
  }
}
