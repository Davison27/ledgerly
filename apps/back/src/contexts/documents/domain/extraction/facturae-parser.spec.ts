import { parseFacturae } from './facturae-parser';
import { FACTURAE_SAMPLE_XML } from './__fixtures__/facturae-sample.xml';

describe('parseFacturae', () => {
  it('extracts invoice fields from a real Facturae XML document', () => {
    const fields = parseFacturae(FACTURAE_SAMPLE_XML);

    expect(fields).not.toBeNull();
    expect(fields).toEqual({
      issuerName: 'Consultoria Iberica de Sistemas SA',
      issuerTaxId: 'B87654321',
      invoiceNumber: '2026-045',
      date: '2026-02-10',
      currency: 'EUR',
      taxBase: 500,
      taxRate: 21,
      taxAmount: 105,
      amount: 605,
    });
  });

  it('returns null for a non-Facturae XML document', () => {
    const fields = parseFacturae('<?xml version="1.0"?><SomethingElse></SomethingElse>');

    expect(fields).toBeNull();
  });

  it('returns null for malformed XML', () => {
    const fields = parseFacturae('not xml at all <<<');

    expect(fields).toBeNull();
  });
});
