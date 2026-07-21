import { Invoice } from '../../domain/invoice';
import { InvoiceIssuer } from '../../domain/invoice-issuer.port';
import { InvoicePdfView } from '../../domain/invoice-pdf-renderer.port';

/**
 * Pure function, no side effects. This is the only place allowed to build
 * an `InvoicePdfView` (D7): it only ever reads from `invoice` and `issuer`,
 * never from the project, so there is no way for a project field to leak
 * into the printed PDF — see `build-invoice-pdf-view.spec.ts`.
 */
export function buildInvoicePdfView(invoice: Invoice, issuer: InvoiceIssuer): InvoicePdfView {
  return {
    number: invoice.getFullNumber(),
    issueDate: invoice.getIssueDate(),
    issuer: {
      name: issuer.name,
      legalName: issuer.legalName,
      taxId: issuer.taxId,
      address: issuer.address,
      city: issuer.city,
      postalCode: issuer.postalCode,
      country: issuer.country,
      email: issuer.email,
      phone: issuer.phone,
      website: issuer.website,
      logo: issuer.logo,
    },
    customer: {
      name: invoice.getCustomerName(),
      taxId: invoice.getCustomerTaxId(),
      address: invoice.getCustomerAddress(),
    },
    lines: invoice.getLines().map((line) => ({
      description: line.getDescription(),
      unitPrice: line.getUnitPrice(),
    })),
    taxBase: invoice.getTaxBase(),
    taxRate: invoice.getTaxRate(),
    taxAmount: invoice.getTaxAmount(),
    irpfRate: invoice.getIrpfRate(),
    irpfAmount: invoice.getIrpfAmount(),
    total: invoice.getTotal(),
    currency: invoice.getCurrency(),
    notes: invoice.getNotes(),
  };
}
