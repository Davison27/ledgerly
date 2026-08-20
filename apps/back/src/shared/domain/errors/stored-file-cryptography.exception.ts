import { DomainException } from '../domain.exception';

export class StoredFileCryptographyException extends DomainException {
  readonly code = 'STORED_FILE_CRYPTOGRAPHY_FAILED';

  constructor() {
    super('Stored file could not be processed');
  }
}
