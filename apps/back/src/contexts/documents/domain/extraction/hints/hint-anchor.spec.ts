import { applyHints, deriveHint } from './hint-anchor';
import { InvoiceHint } from './invoice-hint';

function hint(overrides: Partial<InvoiceHint>): InvoiceHint {
  return {
    id: 'hint-1',
    issuerTaxId: 'B12345678',
    field: 'date',
    anchorKind: 'inline',
    anchorLabel: 'Fecha',
    lineOffset: 0,
    sampleValue: '2026-03-15',
    occurrences: 1,
    ...overrides,
  };
}

describe('deriveHint', () => {
  it('derives an inline anchor when the label sits before the value on the same line', () => {
    const text = ['Mi Empresa SL', 'CIF: B12345678', 'Fecha: 15/03/2026', 'TOTAL: 100,00 EUR'].join('\n');

    const derived = deriveHint(text, 'date', '2026-03-15');

    expect(derived).toEqual({
      anchorKind: 'inline',
      anchorLabel: 'Fecha',
      lineOffset: 0,
      sampleValue: '2026-03-15',
    });
  });

  it('derives a preceding-line anchor when the value sits alone on its own line', () => {
    const text = ['Mi Empresa SL', 'Fecha de emision', '15/03/2026', 'TOTAL: 100,00 EUR'].join('\n');

    const derived = deriveHint(text, 'date', '2026-03-15');

    expect(derived).toEqual({
      anchorKind: 'preceding-line',
      anchorLabel: 'Fecha de emision',
      lineOffset: 1,
      sampleValue: '2026-03-15',
    });
  });

  it('locates a Spanish long-form date representation', () => {
    const text = ['Mi Empresa SL', 'Emitida el 15 de marzo de 2026', 'TOTAL: 100,00 EUR'].join('\n');

    const derived = deriveHint(text, 'date', '2026-03-15');

    expect(derived).toEqual({
      anchorKind: 'inline',
      anchorLabel: 'Emitida el',
      lineOffset: 0,
      sampleValue: '2026-03-15',
    });
  });

  it('locates a Spanish-formatted amount (thousands dot, comma decimals)', () => {
    const text = ['Mi Empresa SL', 'Fecha: 15/03/2026', 'TOTAL A PAGAR: 1.234,56 EUR'].join('\n');

    const derived = deriveHint(text, 'amount', 1234.56);

    expect(derived).toEqual({
      anchorKind: 'inline',
      anchorLabel: 'TOTAL A PAGAR',
      lineOffset: 0,
      sampleValue: '1234.56',
    });
  });

  it('locates a bare-integer tax rate printed without decimals', () => {
    const text = ['Mi Empresa SL', 'IVA aplicado 21%', 'TOTAL: 100,00 EUR'].join('\n');

    const derived = deriveHint(text, 'taxRate', 21);

    expect(derived).toEqual({
      anchorKind: 'inline',
      anchorLabel: 'IVA aplicado',
      lineOffset: 0,
      sampleValue: '21',
    });
  });

  it('locates a tax id printed with a hyphen the corrected value does not have', () => {
    const text = ['Mi Empresa SL', 'CIF: B-12345678', 'TOTAL: 100,00 EUR'].join('\n');

    const derived = deriveHint(text, 'issuerTaxId', 'B12345678');

    expect(derived).toEqual({
      anchorKind: 'inline',
      anchorLabel: 'CIF',
      lineOffset: 0,
      sampleValue: 'B12345678',
    });
  });

  it('returns null when the corrected value cannot be found in the text', () => {
    const text = ['Mi Empresa SL', 'Fecha: 15/03/2026'].join('\n');

    expect(deriveHint(text, 'amount', 999.99)).toBeNull();
  });

  it('returns null when the value is found but no label can be located above/beside it', () => {
    const text = ['15/03/2026', 'TOTAL: 100,00 EUR'].join('\n');

    expect(deriveHint(text, 'date', '2026-03-15')).toBeNull();
  });
});

describe('applyHints', () => {
  it('overrides a base field using an inline anchor', () => {
    const text = ['Mi Empresa SL', 'Emitida: 15/03/2026', 'TOTAL: 100,00 EUR'].join('\n');
    const hints = [hint({ field: 'date', anchorKind: 'inline', anchorLabel: 'Emitida', sampleValue: '2026-03-15' })];

    const result = applyHints({}, hints, text);

    expect(result.date).toBe('2026-03-15');
  });

  it('overrides a base field using a preceding-line anchor', () => {
    const text = ['Mi Empresa SL', 'Fecha de emision', '15/03/2026', 'TOTAL: 100,00 EUR'].join('\n');
    const hints = [
      hint({ field: 'date', anchorKind: 'preceding-line', anchorLabel: 'Fecha de emision', lineOffset: 1 }),
    ];

    const result = applyHints({}, hints, text);

    expect(result.date).toBe('2026-03-15');
  });

  it('parses a number field located through its anchor', () => {
    const text = ['Mi Empresa SL', 'Base imponible especial: 1.234,56 EUR'].join('\n');
    const hints = [
      hint({
        field: 'taxBase',
        anchorKind: 'inline',
        anchorLabel: 'Base imponible especial',
        sampleValue: '1234.56',
      }),
    ];

    const result = applyHints({}, hints, text);

    expect(result.taxBase).toBe(1234.56);
  });

  it('leaves the base field untouched when the anchor label cannot be found', () => {
    const text = ['Mi Empresa SL', 'TOTAL: 100,00 EUR'].join('\n');
    const hints = [hint({ field: 'date', anchorKind: 'inline', anchorLabel: 'Fecha de emision' })];

    const result = applyHints({ date: '2026-01-01' }, hints, text);

    expect(result.date).toBe('2026-01-01');
  });

  it('does not mutate the base fields object', () => {
    const text = ['Fecha: 15/03/2026'].join('\n');
    const base = { date: '2026-01-01' };
    const hints = [hint({ field: 'date', anchorKind: 'inline', anchorLabel: 'Fecha' })];

    const result = applyHints(base, hints, text);

    expect(base.date).toBe('2026-01-01');
    expect(result.date).toBe('2026-03-15');
    expect(result).not.toBe(base);
  });

  it('applies multiple hints for different fields independently', () => {
    const text = ['Emisor especial', 'Fecha: 15/03/2026', 'Numero factura: FA-2026-0099'].join('\n');
    const hints = [
      hint({ field: 'date', anchorKind: 'inline', anchorLabel: 'Fecha' }),
      hint({
        field: 'invoiceNumber',
        anchorKind: 'inline',
        anchorLabel: 'Numero factura',
        sampleValue: 'FA-2026-0099',
      }),
    ];

    const result = applyHints({}, hints, text);

    expect(result.date).toBe('2026-03-15');
    expect(result.invoiceNumber).toBe('FA-2026-0099');
  });
});
