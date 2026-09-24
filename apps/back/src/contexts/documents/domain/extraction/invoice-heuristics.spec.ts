import { extractInvoiceHeuristics } from './invoice-heuristics';

describe('extractInvoiceHeuristics', () => {
  it('extracts fields from a realistic Spanish invoice text block (label-first layout)', () => {
    const text = [
      'Suministros Industriales del Norte SL',
      'CIF: B12345678',
      'Calle Mayor 12, 28001 Madrid',
      '',
      'FACTURA',
      'Numero de factura: FA-2026-0088',
      'Fecha: 15/03/2026',
      'Fecha de vencimiento: 14/04/2026',
      '',
      'Cliente: Ledgerly ERP SL',
      'CIF cliente: B99999999',
      '',
      'Concepto            Cantidad   Precio   Importe',
      'Servicios de consultoria  10   100,00   1.000,00',
      '',
      'BASE IMPONIBLE: 1.000,00 EUR',
      'IVA 21%: 210,00 EUR',
      'TOTAL: 1.210,00 EUR',
    ].join('\n');

    const { fields, warnings } = extractInvoiceHeuristics(text);

    expect(fields).toEqual({
      issuerName: 'Suministros Industriales del Norte SL',
      issuerTaxId: 'B12345678',
      invoiceNumber: 'FA-2026-0088',
      date: '2026-03-15',
      dueDate: '2026-04-14',
      currency: 'EUR',
      taxBase: 1000,
      taxRate: 21,
      taxAmount: 210,
      amount: 1210,
    });
    expect(warnings).toEqual([]);
  });

  it('extracts fields from a realistic Spanish invoice text block (alternate phrasing)', () => {
    const text = [
      'Consultoria Iberica de Sistemas SA',
      'NIF: B87654321',
      'Avenida de la Constitucion 45, 41001 Sevilla',
      '',
      'Cliente: Panaderia El Trigal SL',
      'NIF cliente: B11223344',
      '',
      'Factura Nº: 2026/045',
      'Fecha de emision: 2026-02-10',
      '',
      'Descripcion                    Importe',
      'Servicios de auditoria         500,00',
      '',
      'Base imponible: 500,00 EUR',
      'IVA (21%): 105,00 EUR',
      'TOTAL FACTURA: 605,00 EUR',
    ].join('\n');

    const { fields, warnings } = extractInvoiceHeuristics(text);

    expect(fields).toEqual({
      issuerName: 'Consultoria Iberica de Sistemas SA',
      issuerTaxId: 'B87654321',
      invoiceNumber: '2026/045',
      date: '2026-02-10',
      currency: 'EUR',
      taxBase: 500,
      taxRate: 21,
      taxAmount: 105,
      amount: 605,
    });
    expect(warnings).toEqual([]);
  });

  it('omits fields it cannot determine and reports warnings', () => {
    const { fields, warnings } = extractInvoiceHeuristics('This is just some unrelated scanned OCR noise.');

    expect(fields).toEqual({});
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('prefers the issuer CIF/NIF over one found next to a "cliente" label', () => {
    const text = ['Mi Empresa SL', 'CIF cliente: A11111111', 'CIF: B22222222', 'TOTAL: 100,00 EUR'].join('\n');

    const { fields } = extractInvoiceHeuristics(text);

    expect(fields.issuerTaxId).toBe('B22222222');
  });

  it('extracts irpfRate and irpfAmount from a labelled "IRPF" line with an inline amount', () => {
    const text = [
      'Suministros Industriales del Norte SL',
      'CIF: B12345678',
      'FACTURA',
      'Numero de factura: FA-2026-0088',
      'Fecha: 15/03/2026',
      'BASE IMPONIBLE: 1.000,00 EUR',
      'IVA 21%: 210,00 EUR',
      'IRPF 15% -150,00',
      'TOTAL: 1.060,00 EUR',
    ].join('\n');

    const { fields } = extractInvoiceHeuristics(text);

    expect(fields.irpfRate).toBe(15);
    expect(fields.irpfAmount).toBe(150);
  });

  it('extracts a labelled "Retención" line as IRPF', () => {
    const text = [
      'Consultoria Iberica de Sistemas SA',
      'NIF: B87654321',
      'Factura Nº: 2026/045',
      'Base imponible: 500,00 EUR',
      'IVA (21%): 105,00 EUR',
      'Retención 7 %: -35,00 EUR',
      'TOTAL FACTURA: 570,00 EUR',
    ].join('\n');

    const { fields } = extractInvoiceHeuristics(text);

    expect(fields.irpfRate).toBe(7);
    expect(fields.irpfAmount).toBe(35);
  });

  it('omits irpfRate and irpfAmount when the invoice has no IRPF/retención line', () => {
    const text = [
      'Suministros Industriales del Norte SL',
      'CIF: B12345678',
      'BASE IMPONIBLE: 1.000,00 EUR',
      'IVA 21%: 210,00 EUR',
      'TOTAL: 1.210,00 EUR',
    ].join('\n');

    const { fields } = extractInvoiceHeuristics(text);

    expect(fields.irpfRate).toBeUndefined();
    expect(fields.irpfAmount).toBeUndefined();
  });

  it('drops a due date that is earlier than the invoice date', () => {
    const text = [
      'Suministros Industriales del Norte SL',
      'CIF: B12345678',
      'Fecha: 15/03/2026',
      'Fecha de vencimiento: 01/01/2020',
      'TOTAL: 100,00 EUR',
    ].join('\n');

    const { fields } = extractInvoiceHeuristics(text);

    expect(fields.date).toBe('2026-03-15');
    expect(fields.dueDate).toBeUndefined();
  });

  it('sums base and VAT across two rates, leaves taxRate empty, and warns about multiple rates', () => {
    const text = [
      'Panaderia y Pasteleria El Horno SL',
      'CIF: B12345678',
      'Factura numero de factura: FA-1',
      'Fecha: 12/08/2026',
      'Base imponible 10%: 500,00 EUR',
      'IVA 10%: 50,00 EUR',
      'Base imponible 21%: 1.000,00 EUR',
      'IVA 21%: 210,00 EUR',
      'TOTAL: 1.760,00 EUR',
    ].join('\n');

    const { fields, warnings } = extractInvoiceHeuristics(text);

    expect(fields.taxBase).toBe(1500);
    expect(fields.taxAmount).toBe(260);
    expect(fields.taxRate).toBeUndefined();
    expect(fields.amount).toBe(1760);
    expect(warnings).toContain('multiple_tax_rates');
  });

  it('keeps the labelled total and warns when the amounts do not reconcile', () => {
    const text = [
      'Suministros Industriales del Norte SL',
      'CIF: B12345678',
      'BASE IMPONIBLE: 1.000,00 EUR',
      'IVA 21%: 210,00 EUR',
      'TOTAL: 9.999,00 EUR',
    ].join('\n');

    const { fields, warnings } = extractInvoiceHeuristics(text);

    expect(fields.amount).toBe(9999);
    expect(fields.taxBase).toBe(1000);
    expect(fields.taxAmount).toBe(210);
    expect(warnings).toContain('amounts_inconsistent');
  });

  it('excludes the company own tax id from the issuer candidates, even when it sits inside the client block', () => {
    const text = [
      'Suministros y Materiales del Ebro SL',
      'CIF: B64738297',
      'FACTURA',
      'Numero de factura: FA-2026-0700',
      'Fecha: 22/09/2026',
      'Cliente: Ledgerly ERP SL',
      'CIF cliente: A99988875',
      'BASE IMPONIBLE: 400,00 EUR',
      'IVA 21%: 84,00 EUR',
      'TOTAL: 484,00 EUR',
    ].join('\n');

    const { fields } = extractInvoiceHeuristics(text, { excludedTaxIds: ['A99988875'] });

    expect(fields.issuerTaxId).toBe('B64738297');
    expect(fields.issuerName).toBe('Suministros y Materiales del Ebro SL');
  });

  it('never picks the excluded tax id as the issuer, nor a name from the same block', () => {
    const text = [
      'Ledgerly ERP SL',
      'CIF: A99988875',
      'Proveedor real: Suministros del Ebro SL',
      'CIF proveedor: B64738297',
      'TOTAL: 100,00 EUR',
    ].join('\n');

    const { fields } = extractInvoiceHeuristics(text, { excludedTaxIds: ['A99988875'] });

    expect(fields.issuerTaxId).toBe('B64738297');
  });
});
