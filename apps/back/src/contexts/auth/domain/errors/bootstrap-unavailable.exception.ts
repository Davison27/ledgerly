import { DomainException } from '../../../../shared/domain/domain.exception';

export class BootstrapUnavailableException extends DomainException {
  readonly code = 'BOOTSTRAP_UNAVAILABLE';

  constructor() {
    super('setup unavailable');
  }
}
