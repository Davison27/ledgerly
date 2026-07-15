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
});
