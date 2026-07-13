import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';

export class CompanyNotFoundException extends EntityNotFoundException {
  constructor() {
    super('Company', 'current');
  }
}
