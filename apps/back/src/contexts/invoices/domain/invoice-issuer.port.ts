export const INVOICE_ISSUER_PROVIDER = Symbol('InvoiceIssuerProvider');

export interface InvoiceIssuer {
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
}

export interface InvoiceIssuerProvider {
  get(): Promise<InvoiceIssuer>;
}
