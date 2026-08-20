import { parseFacturx } from './facturx-parser';
import { FACTURX_SAMPLE_XML } from './__fixtures__/facturx-sample.xml';

const REPEATED_DOCTYPE_FACTURX_XML = `<!DOCTYPE CrossIndustryInvoice [<!ENTITY first "x">]><CrossIndustryInvoice><ExchangedDocument><ID>${'&first;'.repeat(9000)}</ID></ExchangedDocument><!DOCTYPE CrossIndustryInvoice [<!ENTITY second "x">]><ExchangedDocument><IssueDateTime><DateTimeString>${'&second;'.repeat(9000)}</DateTimeString></IssueDateTime></ExchangedDocument></CrossIndustryInvoice>`;

describe('parseFacturx', () => {
  it('extracts invoice fields from a real Factur-X CII XML document', () => {
    const fields = parseFacturx(FACTURX_SAMPLE_XML);

    expect(fields).not.toBeNull();
    expect(fields).toEqual({
      issuerName: 'Suministros Industriales del Norte SL',
      issuerTaxId: 'B12345678',
      invoiceNumber: 'FX-2026-000123',
      date: '2026-01-15',
      dueDate: '2026-02-14',
      currency: 'EUR',
      taxBase: 1000,
      taxRate: 21,
      taxAmount: 210,
      amount: 1210,
    });
  });

  it('returns null for a non-CII XML document', () => {
    const fields = parseFacturx('<?xml version="1.0"?><SomethingElse></SomethingElse>');

    expect(fields).toBeNull();
  });

  it('returns null for malformed XML', () => {
    const fields = parseFacturx('not xml at all <<<');

    expect(fields).toBeNull();
  });

  it('returns null for repeated DOCTYPE entity expansions', () => {
    const fields = parseFacturx(REPEATED_DOCTYPE_FACTURX_XML);

    expect(fields).toBeNull();
  });
});
