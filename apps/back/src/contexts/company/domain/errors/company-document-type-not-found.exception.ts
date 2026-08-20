import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';

export class CompanyDocumentTypeNotFoundException extends EntityNotFoundException {
  constructor(id: string) {
    super('CompanyDocumentType', id);
  }
}
