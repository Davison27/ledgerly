import { DomainException } from '../../../../shared/domain/domain.exception';

export class ClientArchivedException extends DomainException {
  readonly code = 'CLIENT_ARCHIVED';

  constructor(id: string) {
    super(`Client with id ${id} is archived`);
  }
}
