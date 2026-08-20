import { DomainException } from '../../../../shared/domain/domain.exception';

export class StaffDocumentNotFoundException extends DomainException {
  readonly code = 'ENTITY_NOT_FOUND';

  constructor() {
    super('Staff document was not found');
  }
}
