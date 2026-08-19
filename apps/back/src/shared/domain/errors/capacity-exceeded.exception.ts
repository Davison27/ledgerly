import { DomainException } from '../domain.exception';

export class CapacityExceededException extends DomainException {
  readonly code = 'PDF_CAPACITY_EXCEEDED';

  constructor(readonly retryAfterSeconds: number) {
    super('PDF processing capacity is currently full');
  }
}
