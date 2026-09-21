import { normalizeTaxId } from './tax-id';

describe('normalizeTaxId', () => {
  it('trims, uppercases, and removes spaces, hyphens, and dots', () => {
    expect(normalizeTaxId('  es-b. 123 456.78  ')).toBe('ESB12345678');
  });

  it('converts null, undefined, and punctuation-only values to null', () => {
    expect(normalizeTaxId(null)).toBeNull();
    expect(normalizeTaxId(undefined)).toBeNull();
    expect(normalizeTaxId(' .-  ')).toBeNull();
  });
});
