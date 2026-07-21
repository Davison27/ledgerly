export const INVOICE_PDF_RENDERER = Symbol('InvoicePdfRenderer');

/**
 * D7 — the structural guarantee that the project can never leak into the
 * PDF: this type has no `projectId`, no project name, nothing about the
 * project at all. `buildInvoicePdfView` is the only place allowed to build
 * one, and it is a pure function tested to never smuggle a project field
 * in. Adding one here "for convenience" is exactly the regression to catch
 * in review.
 */
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
