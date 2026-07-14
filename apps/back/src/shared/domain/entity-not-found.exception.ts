import { DomainException } from './domain.exception';

export class EntityNotFoundException extends DomainException {
  readonly code = 'ENTITY_NOT_FOUND';

  constructor(entity: string, id: string) {
    super(`${entity} with id ${id} was not found`);
  }
}
