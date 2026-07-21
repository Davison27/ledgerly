import { PdfkitInvoicePdfRenderer } from './pdfkit-invoice-pdf-renderer';
import { InvoicePdfView } from '../../domain/invoice-pdf-renderer.port';

const VIEW: InvoicePdfView = {
  number: 'F-2026-0001',
  issueDate: '2026-06-01',
  issuer: {
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
  },
  customer: {
    name: 'Cliente SL',
    taxId: 'B87654321',
    address: 'Calle Cliente 1',
  },
  lines: [
    { description: 'Consultoría técnica (ñ, á, €)', quantity: 1, unitPrice: 100, amount: 100 },
    { description: 'Desarrollo', quantity: 2, unitPrice: 200, amount: 400 },
  ],
  taxBase: 300,
  taxRate: 21,
  taxAmount: 63,
  irpfRate: 15,
  irpfAmount: 45,
  total: 318,
  currency: 'EUR',
  notes: 'Pago por transferencia en 30 días',
};

describe('PdfkitInvoicePdfRenderer', () => {
  it('returns a buffer starting with the PDF magic bytes', async () => {
    const renderer = new PdfkitInvoicePdfRenderer();

    const pdf = await renderer.render(VIEW);

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('renders accents, ñ and € without throwing', async () => {
    const renderer = new PdfkitInvoicePdfRenderer();

    await expect(renderer.render(VIEW)).resolves.toBeInstanceOf(Buffer);
  });

  it('omits the logo without failing when it is not a data-URL image', async () => {
    const renderer = new PdfkitInvoicePdfRenderer();

    const pdf = await renderer.render({
      ...VIEW,
      issuer: { ...VIEW.issuer, logo: 'not-a-data-url' },
    });

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
