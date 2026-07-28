import { DomainException } from '../../../../shared/domain/domain.exception';

export class OAuthLoginFailedException extends DomainException {
  readonly code = 'OAUTH_LOGIN_FAILED';

  constructor(message: string) {
    super(message);
  }
}
