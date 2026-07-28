import { DomainException } from '../../../../shared/domain/domain.exception';

export class OAuthAttemptExpiredException extends DomainException {
  readonly code = 'OAUTH_ATTEMPT_EXPIRED';

  constructor() {
    super('the login attempt has expired');
  }
}
