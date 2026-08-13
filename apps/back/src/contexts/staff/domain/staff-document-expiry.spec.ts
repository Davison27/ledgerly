import { classifyExpiry } from './staff-document-expiry';

describe('classifyExpiry', () => {
  const today = '2026-07-01';

  it('returns none when there is no expiry date', () => {
    expect(classifyExpiry(null, today)).toBe('none');
  });

  it('returns expired for dates before today', () => {
    expect(classifyExpiry('2026-06-30', today)).toBe('expired');
  });

  it('returns expiring today and at the thirty-day boundary', () => {
    expect(classifyExpiry(today, today)).toBe('expiring');
    expect(classifyExpiry('2026-07-31', today)).toBe('expiring');
  });

  it('returns valid after the expiring window', () => {
    expect(classifyExpiry('2026-08-01', today)).toBe('valid');
  });
});
