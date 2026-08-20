import { DomainException } from '../domain.exception';

export class StoredFileConfigurationException extends DomainException {
  readonly code = 'STORED_FILE_CONFIGURATION_INVALID';

  constructor() {
    super('Stored file encryption configuration is invalid');
  }
}
