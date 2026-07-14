import { DomainException } from './domain.exception';

export class InvalidValueException extends DomainException {
  readonly code = 'INVALID_VALUE';

  constructor(message: string) {
    super(message);
  }
}
