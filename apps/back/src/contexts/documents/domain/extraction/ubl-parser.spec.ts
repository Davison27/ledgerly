import { parseUbl } from './ubl-parser';
import { UBL_SAMPLE_WITH_IRPF_XML, UBL_SAMPLE_XML } from './__fixtures__/ubl-sample.xml';

describe('parseUbl', () => {
  it('extracts invoice fields from a real UBL 2.1 (Peppol BIS Billing 3.0) XML document', () => {
    const fields = parseUbl(UBL_SAMPLE_XML);

    expect(fields).not.toBeNull();
    expect(fields).toEqual({
      issuerName: 'Peppol Digital Services SL',
      issuerTaxId: 'ESB11223344',
      invoiceNumber: 'UBL-2026-0099',
      date: '2026-03-15',
      dueDate: '2026-04-14',
      currency: 'EUR',
      taxBase: 800,
      taxRate: 21,
      taxAmount: 168,
      amount: 968,
    });
  });

  it('does not emit irpfRate/irpfAmount when there is no WithholdingTaxTotal block', () => {
    const fields = parseUbl(UBL_SAMPLE_XML);

    expect(fields?.irpfRate).toBeUndefined();
    expect(fields?.irpfAmount).toBeUndefined();
  });

  it('extracts irpfRate/irpfAmount from WithholdingTaxTotal', () => {
    const fields = parseUbl(UBL_SAMPLE_WITH_IRPF_XML);

    expect(fields).not.toBeNull();
    expect(fields).toEqual({
      issuerName: 'Peppol Digital Services SL',
      issuerTaxId: 'ESB11223344',
      invoiceNumber: 'UBL-2026-0099',
      date: '2026-03-15',
      dueDate: '2026-04-14',
      currency: 'EUR',
      taxBase: 800,
      taxRate: 21,
      taxAmount: 168,
      irpfRate: 15,
      irpfAmount: 120,
      amount: 848,
    });
  });

  it('returns null for a non-UBL XML document', () => {
    const fields = parseUbl('<?xml version="1.0"?><SomethingElse></SomethingElse>');

    expect(fields).toBeNull();
  });

  it('returns null for malformed XML', () => {
    const fields = parseUbl('not xml at all <<<');

    expect(fields).toBeNull();
  });
});
