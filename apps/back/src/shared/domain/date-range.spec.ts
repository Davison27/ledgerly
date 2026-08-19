import {
  assertDateRangeWithinDays,
  DateRangeLimitExceededException,
  InvalidDateRangeException,
} from './date-range';

describe('assertDateRangeWithinDays', () => {
  it('accepts an inclusive range within the configured limit', () => {
    expect(() => assertDateRangeWithinDays('2026-01-01', '2026-01-31', 31)).not.toThrow();
  });

  it('rejects a reversed or malformed range', () => {
    expect(() => assertDateRangeWithinDays('2026-02-01', '2026-01-31', 31)).toThrow(
      InvalidDateRangeException,
    );
    expect(() => assertDateRangeWithinDays('01-02-2026', '2026-01-31', 31)).toThrow(
      InvalidDateRangeException,
    );
  });

  it('rejects a range longer than the configured limit', () => {
    expect(() => assertDateRangeWithinDays('2026-01-01', '2026-02-01', 31)).toThrow(
      DateRangeLimitExceededException,
    );
  });
});
