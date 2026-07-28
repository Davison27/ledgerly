import { DomainException } from '../../../../shared/domain/domain.exception';

export class GoogleIdentityRejectedException extends DomainException {
  readonly code = 'INVALID_VALUE';

  constructor(message: string) {
    super(message);
  }
}
