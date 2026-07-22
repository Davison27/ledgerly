import { extractInvoiceHeuristics } from './invoice-heuristics';

describe('extractInvoiceHeuristics (column-separated / reversed layouts)', () => {
  it('extracts fields from a cooperativa-style layout with client on top and totals in a separate column', () => {
    const text = [
      'Producciones Ejemplo SL',
      'Avenida de la Prueba, 49',
      '00000 - Villa Ejemplo (Provincia)',
      'Cliente',
      'Dirección:',
      'CIF: B00000001',
      'Cliente número 111',
      '01/02/2026',
      'fecha',
      'FACTURA 10/500',
      'Colaborador 007 Nombre Apellido Demo',
      'CANT. CONCEPTO TOTALPRECIO',
      'Cooperativa Demo',
      'de servicios audiovisuales',
      'NIF: F00000002',
      'Calle Ficticia, 1',
      '00001 Ciudad',
      'tel.: 600 000 000',
      'SERVICIO DEMO 2,00 250,00 € 500,00 €',
      '8-9/2/2026',
      'Transferencia Bancaria',
      'ES00 0000 0000 0000 0000 0000',
      'PAGO:',
      'Base Exenta',
      'Base Imponible',
      'IVA (21%)',
      'TOTAL',
      '500,00',
      '105,00',
      '605,00',
      'IMPORTANTE: POR FAVOR INDICAR EL NÚMERO DE FACTURA AL EFECTUAR EL PAGO',
      'IBAN:',
      'BIC:',
    ].join('\n');

    const { fields, warnings } = extractInvoiceHeuristics(text);

    expect(fields.invoiceNumber).toBe('10/500');
    expect(fields.date).toBe('2026-02-01');
    expect(fields.taxRate).toBe(21);
    expect(fields.taxBase).toBe(500);
    expect(fields.taxAmount).toBeCloseTo(105);
    expect(fields.amount).toBeCloseTo(605);
    expect(fields.issuerTaxId).toBe('F00000002');

    expect(warnings).not.toContain('No se pudo determinar el importe total');
    expect(warnings).not.toContain('No se pudo determinar la fecha de la factura');
  });

  it('extracts fields from a table-column layout with month-name date, IRPF and a DNI issuer at the bottom', () => {
    const text = [
      'Factura CLIENTE: Producciones Ejemplo',
      'audiovisuales, S.L.',
      'Nº FACTURA: 2026_07 Calle Falsa 123',
      'FECHA FACTURA: 15_Marzo_2026 00000, Ciudad',
      'CIF:B-00000001',
      'Descripcion Jornadas Precio Total',
      'Servicio demo A 2 250,00 € 500,00 €',
      'Servicio demo B 1 100,00 € 100,00 €',
      'GASTOS SUPLIDOS',
      'Dieta 1 30,00 € 30,00 €',
      '1.000,00 €',
      '210,00 €',
      '-150,00 €',
      'Gastos 30,00 €',
      '1.090,00 €',
      'International Banking Account Number (IBAN): Bank Identification Code (BIC):',
      'ES00 0000 0000 0000 0000 0000 XXXXXXXX',
      'BASE IMPONIBLE',
      'IVA 21 %',
      'IRPF 15 %',
      'TOTAL EUR',
      'Nombre Apellido Ejemplo',
      'Calle Inventada, 8',
      '00000 Ciudad (Provincia)',
      'N.I.F.: 00000000T',
    ].join('\n');

    const { fields, warnings } = extractInvoiceHeuristics(text);

    expect(fields.invoiceNumber).toBe('2026_07');
    expect(fields.date).toBe('2026-03-15');
    expect(fields.taxRate).toBe(21);
    expect(fields.taxBase).toBe(1000);
    expect(fields.taxAmount).toBeCloseTo(210);
    expect(fields.amount).toBeCloseTo(1090);
    expect(fields.issuerTaxId).toBe('00000000T');

    expect(fields.irpfRate).toBe(15);
    expect(fields.irpfAmount).toBeUndefined();

    expect(warnings).not.toContain('No se pudo determinar el importe total');
  });
});
