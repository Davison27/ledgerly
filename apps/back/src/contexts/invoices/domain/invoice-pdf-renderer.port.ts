export const INVOICE_PDF_RENDERER = Symbol('InvoicePdfRenderer');

export interface InvoicePdfView {
  number: string;
  issueDate: string;
  issuer: {
    name: string;
    legalName: string | null;
    taxId: string;
    address: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    logo: string | null;
  };
  customer: {
    name: string;
    taxId: string | null;
    address: string | null;
  };
  lines: { description: string; quantity: number; unitPrice: number; amount: number }[];
  taxBase: number;
  taxRate: number;
  taxAmount: number;
  irpfRate: number;
  irpfAmount: number;
  total: number;
  currency: string;
  notes: string | null;
}

export interface InvoicePdfRenderer {
  render(view: InvoicePdfView): Promise<Buffer>;
}
