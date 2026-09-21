import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';

export class ClientNotFoundException extends EntityNotFoundException {
  constructor(id: string) {
    super('Client', id);
  }
}
