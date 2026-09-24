import { canonicalSpanishTaxId, findSpanishTaxIds, isValidSpanishTaxId, normaliseTaxId } from './tax-id';

describe('normaliseTaxId', () => {
  it('uppercases and strips dashes', () => {
    expect(normaliseTaxId('b-1234567-4')).toBe('B12345674');
  });
});

describe('canonicalSpanishTaxId', () => {
  it('normalises spacing, dots and dashes', () => {
    expect(canonicalSpanishTaxId('b 12345674')).toBe('B12345674');
  });

  it('strips a leading ES prefix when 9 characters remain', () => {
    expect(canonicalSpanishTaxId('ESB12345674')).toBe('B12345674');
  });

  it('keeps a non-ES value unchanged', () => {
    expect(canonicalSpanishTaxId('12345678Z')).toBe('12345678Z');
  });
});

describe('isValidSpanishTaxId', () => {
  it('accepts a valid NIF', () => {
    expect(isValidSpanishTaxId('12345678Z')).toBe(true);
  });

  it('rejects a NIF with a wrong control letter', () => {
    expect(isValidSpanishTaxId('12345678A')).toBe(false);
  });

  it('accepts a valid NIE', () => {
    expect(isValidSpanishTaxId('X1234567L')).toBe(true);
  });

  it('rejects a NIE with a wrong control letter', () => {
    expect(isValidSpanishTaxId('X1234567A')).toBe(false);
  });

  it('accepts a valid K/L/M document', () => {
    expect(isValidSpanishTaxId('K1234567L')).toBe(true);
  });

  it('accepts a valid CIF with a digit control character', () => {
    expect(isValidSpanishTaxId('B12345674')).toBe(true);
  });

  it('accepts a valid CIF with a letter control character', () => {
    expect(isValidSpanishTaxId('Q0000000J')).toBe(true);
  });

  it('rejects a well-formed but checksum-invalid CIF', () => {
    expect(isValidSpanishTaxId('B12345678')).toBe(false);
  });

  it('accepts a value with the ES prefix', () => {
    expect(isValidSpanishTaxId('ESB12345674')).toBe(true);
  });

  it('rejects a value that is not a recognised format', () => {
    expect(isValidSpanishTaxId('ABC')).toBe(false);
  });
});

describe('findSpanishTaxIds', () => {
  it('finds a CIF and reports its checksum validity', () => {
    const matches = findSpanishTaxIds('CIF: B12345674 Calle Mayor 12');

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ value: 'B12345674', checksumValid: true });
  });

  it('finds every tax ID on a line', () => {
    const matches = findSpanishTaxIds('Emisor B12345674 Cliente 12345678Z');

    expect(matches.map((match) => match.value)).toEqual(['B12345674', '12345678Z']);
  });

  it('accepts an ES prefix', () => {
    const matches = findSpanishTaxIds('VAT: ESB12345674');

    expect(matches[0]).toMatchObject({ value: 'B12345674', checksumValid: true });
  });

  it('reports checksum-invalid well-formed IDs', () => {
    const matches = findSpanishTaxIds('CIF: B12345678');

    expect(matches[0]).toMatchObject({ value: 'B12345678', checksumValid: false });
  });

  it('tolerates a dash after the leading letter of a CIF', () => {
    const matches = findSpanishTaxIds('CIF: B-12345674');

    expect(matches[0]).toMatchObject({ value: 'B12345674', checksumValid: true });
  });

  it('tolerates a dash before the control letter of a NIF', () => {
    const matches = findSpanishTaxIds('NIF: 12345678-Z');

    expect(matches[0]).toMatchObject({ value: '12345678Z', checksumValid: true });
  });

  it('does not match inside an IBAN', () => {
    const matches = findSpanishTaxIds('IBAN: ES9121000418450200051332');

    expect(matches).toHaveLength(0);
  });
});
