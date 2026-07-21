export const INVOICE_ISSUER_PROVIDER = Symbol('InvoiceIssuerProvider');

/**
 * Decouples `invoices` from `company`, the same way
 * `documents/domain/project-existence-checker.port.ts` decouples `documents`
 * from `projects`. `taxId` is non-nullable here: the implementation
 * (`CompanyRepositoryInvoiceIssuer`) is the one that enforces D8 and throws
 * before ever handing out an issuer without one.
 */
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
