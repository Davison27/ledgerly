import { DomainException } from '../domain/domain.exception';

export class ListLimitExceededException extends DomainException {
  readonly code = 'LIST_LIMIT_EXCEEDED';

  constructor(readonly limit: number, readonly resource: string) {
    super(`${resource} exceeds the configured maximum of ${limit} items`);
  }
}

export function getListLimit(environmentKey: string, fallback: number): number {
  const configured = Number(process.env[environmentKey]);
  return Number.isInteger(configured) && configured > 0 ? configured : fallback;
}
