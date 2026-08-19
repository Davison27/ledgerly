import { DomainException } from './domain.exception';

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class InvalidDateRangeException extends DomainException {
  readonly code = 'INVALID_DATE_RANGE';

  constructor() {
    super('The date range is invalid');
  }
}

export class DateRangeLimitExceededException extends DomainException {
  readonly code = 'DATE_RANGE_LIMIT_EXCEEDED';

  constructor(readonly limit: number) {
    super(`The date range exceeds the configured maximum of ${limit} days`);
  }
}

export function assertDateRangeWithinDays(from: string, to: string, limit: number): void {
  if (!ISO_DATE_PATTERN.test(from) || !ISO_DATE_PATTERN.test(to)) {
    throw new InvalidDateRangeException();
  }

  const fromTime = Date.parse(`${from}T00:00:00Z`);
  const toTime = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(fromTime) || !Number.isFinite(toTime) || toTime < fromTime) {
    throw new InvalidDateRangeException();
  }

  const days = Math.floor((toTime - fromTime) / DAY_MS) + 1;
  if (days > limit) {
    throw new DateRangeLimitExceededException(limit);
  }
}
