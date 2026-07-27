import { retentionThreshold } from './notification-thresholds';

describe('retentionThreshold', () => {
  it('subtracts the given number of days in UTC', () => {
    const threshold = retentionThreshold(new Date('2026-07-18T00:00:00Z'), 90);

    expect(threshold.toISOString()).toBe('2026-04-19T00:00:00.000Z');
  });

  it('does not mutate the given date', () => {
    const now = new Date('2026-07-18T00:00:00Z');

    retentionThreshold(now, 90);

    expect(now.toISOString()).toBe('2026-07-18T00:00:00.000Z');
  });
});
