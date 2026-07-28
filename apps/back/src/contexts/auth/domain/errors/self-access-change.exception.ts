import { DomainException } from '../../../../shared/domain/domain.exception';

export class SelfAccessChangeException extends DomainException {
  readonly code = 'SELF_ACCESS_CHANGE';

  constructor() {
    super('cannot change your own access');
  }
}
