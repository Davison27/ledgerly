import { DomainException } from '../../../../shared/domain/domain.exception';

export class LastAdminException extends DomainException {
  readonly code = 'LAST_ADMIN';

  constructor() {
    super('workspace must keep at least one active admin');
  }
}
