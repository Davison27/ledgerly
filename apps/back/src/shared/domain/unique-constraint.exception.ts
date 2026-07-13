import { DomainException } from './domain.exception';

export class UniqueConstraintException extends DomainException {
  readonly code = 'UNIQUE_CONSTRAINT';

  constructor(entity: string, field: string, value: string) {
    super(`${entity} with ${field} ${value} already exists`);
  }
}
