import { buildInvoicePdfView } from './build-invoice-pdf-view';
import { Invoice } from '../../domain/invoice';
import { InvoiceIssuer } from '../../domain/invoice-issuer.port';

const PROJECT_ID = 'project-should-never-appear-in-the-pdf';
const PROJECT_NAME = 'Secret Internal Project Codename';

const ISSUER: InvoiceIssuer = {
  name: 'Acme SL',
  legalName: 'Acme Sociedad Limitada',
  taxId: 'B12345678',
  address: 'Calle Falsa 123',
  city: 'Madrid',
  postalCode: '28080',
  country: 'España',
  email: 'facturacion@acme.example',
  phone: '600111222',
  website: 'https://acme.example',
  logo: null,
};

function buildInvoice(): Invoice {
  return Invoice.create({
    id: 'invoice-1',
    series: 'F',
    year: 2026,
    number: 1,
    issueDate: '2026-06-01',
    projectId: PROJECT_ID,
    customerName: 'Cliente SL',
    customerTaxId: 'B87654321',
    customerAddress: 'Calle Cliente 1',
    lines: [{ description: 'Consultoría', unitPrice: 100 }],
    taxRate: 21,
    irpfRate: 15,
    notes: 'Pago por transferencia',
  });
}

describe('buildInvoicePdfView (D7)', () => {
  it('never contains the project id, however deep, anywhere in the view', () => {
    const view = buildInvoicePdfView(buildInvoice(), ISSUER);

    expect(JSON.stringify(view)).not.toContain(PROJECT_ID);
  });

  it('never contains a project name, because the view has no idea what one is', () => {
    // The invoice domain object itself never receives a project name (only
    // a projectId), so this asserts the negative shape of the type: there
    // is no field the project name could even be assigned to.
    const view = buildInvoicePdfView(buildInvoice(), ISSUER) as unknown as Record<string, unknown>;

    expect(Object.keys(view)).not.toContain('project');
    expect(Object.keys(view)).not.toContain('projectId');
    expect(Object.keys(view)).not.toContain('projectName');
    expect(JSON.stringify(view).toLowerCase()).not.toContain('project');
    expect(JSON.stringify(view)).not.toContain(PROJECT_NAME);
  });

  it('carries the issuer, customer, lines and totals through untouched', () => {
    const invoice = buildInvoice();
    const view = buildInvoicePdfView(invoice, ISSUER);

    expect(view.number).toBe('F-2026-0001');
    expect(view.issuer.taxId).toBe('B12345678');
    expect(view.customer.name).toBe('Cliente SL');
    expect(view.lines).toEqual([{ description: 'Consultoría', unitPrice: 100 }]);
    expect(view.taxBase).toBe(100);
    expect(view.total).toBe(invoice.getTotal());
    expect(view.notes).toBe('Pago por transferencia');
  });
});
