import { isPlausibleInvoiceDate } from './invoice-date';

describe('isPlausibleInvoiceDate', () => {
  it('accepts a valid ISO date within the plausible range', () => {
    expect(isPlausibleInvoiceDate('2026-03-15')).toBe(true);
  });

  it('rejects a year before 2000', () => {
    expect(isPlausibleInvoiceDate('1999-03-15')).toBe(false);
  });

  it('rejects a year after 2099', () => {
    expect(isPlausibleInvoiceDate('2100-03-15')).toBe(false);
  });

  it('rejects a calendar-invalid date', () => {
    expect(isPlausibleInvoiceDate('2026-02-30')).toBe(false);
  });

  it('rejects a non-ISO string', () => {
    expect(isPlausibleInvoiceDate('15/03/2026')).toBe(false);
  });
});
